const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// This file had syntax errors that are now corrected.

const getAllAllocations = async () => {
  return prisma.allocation.findMany({
    include: {
      student: {
        include: { user: true }
      },
      project: true,
      supervisor: {
        include: { user: true }
      },
    }
  });
};

const createAllocation = async (data) => {
  const { studentId, projectId, supervisorId } = data;

  // Validate student exists
  const student = await prisma.student.findUnique({
    where: { id: studentId }
  });
  if (!student) {
    throw new Error('Student not found');
  }

  // Validate project exists and is available
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });
  if (!project) {
    throw new Error('Project not found');
  }

  // Validate supervisor exists
  const supervisor = await prisma.supervisor.findUnique({
    where: { id: supervisorId }
  });
  if (!supervisor) {
    throw new Error('Supervisor not found');
  }

  // Check if student is already allocated to a project
  const existingAllocation = await prisma.allocation.findFirst({
    where: { student_id: studentId }
  });
  if (existingAllocation) {
    throw new Error('Student already allocated to a project');
  }

  return prisma.allocation.create({
    data: {
      student_id: studentId,
      project_id: projectId,
      supervisor_id: supervisorId,
      status: 'active',
    },
    include: {
      student: { include: { user: true } },
      project: true,
      supervisor: { include: { user: true } },
    }
  });
};

const getMyPreferences = async (studentId) => {
  return prisma.studentPreference.findMany({
    where: { student_id: studentId },
    orderBy: { preference_rank: 'asc' },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          difficulty_level: true,
        },
      },
    },
  });
};

const submitPreferences = async (studentId, preferences) => {
  return prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({ where: { id: studentId } });
    if (!student) {
      throw new Error('Student not found.');
    }

    for (const pref of preferences) {
      const project = await tx.project.findUnique({ where: { id: pref.projectId } });
      if (!project || !project.is_available || project.status !== 'approved') {
        throw new Error(`Project ${pref.projectId} not found, not available, or not approved.`);
      }
    }

    await tx.studentPreference.deleteMany({
      where: { student_id: studentId },
    });

    const newPreferences = [];
    for (let i = 0; i < preferences.length; i++) {
      const pref = preferences[i];
      const createdPref = await tx.studentPreference.create({
        data: {
          student_id: studentId,
          project_id: pref.projectId,
          preference_rank: pref.preferenceRank || (i + 1),
        },
      });
      newPreferences.push(createdPref);
    }

    return newPreferences;
  });
};

const manualAllocate = async (allocationData, coordinatorId) => {
  const { projectId, allocatedToId, allocatedToType } = allocationData;

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({ where: { id: projectId }, include: { supervisor: true } });
    if (!project) throw new Error('Project not found.');
    if (!project.is_available || project.status !== 'approved') throw new Error('Project is not available for allocation.');

    const supervisor = project.supervisor;
    if (!supervisor) throw new Error('Project does not have an assigned supervisor.');
    if (supervisor.current_load >= supervisor.max_capacity) throw new Error(`Supervisor has reached maximum capacity.`);

    if (allocatedToType === 'student') {
      const student = await tx.student.findUnique({ where: { id: allocatedToId } });
      if (!student) throw new Error('Student not found.');
      if (student.current_group_id) throw new Error('Student is already in a group.');
    } else if (allocatedToType === 'group') {
      const group = await tx.group.findUnique({ where: { id: allocatedToId }, include: { members: true } });
      if (!group) throw new Error('Group not found.');
      for (const member of group.members) {
        const student = await tx.student.findUnique({ where: { id: member.student_id } });
        if (student.current_group_id) throw new Error(`Student ${student.id} in group is already allocated.`);
      }
    } else {
      throw new Error('Invalid allocation type.');
    }

    const newAllocation = await tx.projectAllocation.create({
      data: {
        project_id: projectId,
        allocated_to_type: allocatedToType,
        allocated_to_id: allocatedToId,
        supervisor_id: supervisor.id,
        allocated_by_id: coordinatorId,
        allocation_phase: 'manual',
        status: 'active',
      },
    });

    await tx.supervisor.update({
      where: { id: supervisor.id },
      data: { current_load: { increment: 1 } },
    });

    if (allocatedToType === 'group') {
        const group = await tx.group.findUnique({ where: { id: allocatedToId }, include: { members: true } });
        const studentIds = group.members.map(m => m.student_id);
        await tx.student.updateMany({
            where: { id: { in: studentIds } },
            data: { current_group_id: allocatedToId },
        });
    } else {
        await tx.student.update({ where: { id: allocatedToId }, data: { current_group_id: allocatedToId } });
    }

    return newAllocation;
  });
};

const updateAllocation = async (id, allocationData) => {
    return prisma.$transaction(async (tx) => {
        const existingAllocation = await tx.projectAllocation.findUnique({ where: { id } });
        if (!existingAllocation) throw new Error('Allocation not found.');

        const dataToUpdate = { ...allocationData };

        if (allocationData.supervisor_id && allocationData.supervisor_id !== existingAllocation.supervisor_id) {
            await tx.supervisor.update({ where: { id: existingAllocation.supervisor_id }, data: { current_load: { decrement: 1 } } });
            await tx.supervisor.update({ where: { id: allocationData.supervisor_id }, data: { current_load: { increment: 1 } } });
        }

        return tx.projectAllocation.update({ where: { id }, data: dataToUpdate });
    });
};

const deleteAllocation = async (id) => {
  return prisma.$transaction(async (tx) => {
    const allocation = await tx.projectAllocation.findUnique({ where: { id } });
    if (!allocation) {
      throw new Error('Allocation not found.');
    }

    await tx.supervisor.update({
      where: { id: allocation.supervisor_id },
      data: { current_load: { decrement: 1 } },
    });

    if (allocation.allocated_to_type === 'student') {
      await tx.student.update({ where: { id: allocation.allocated_to_id }, data: { current_group_id: null } });
    } else if (allocation.allocated_to_type === 'group') {
      const group = await tx.group.findUnique({ where: { id: allocation.allocated_to_id }, include: { members: true } });
      if (group) {
        const studentIds = group.members.map(m => m.student_id);
        await tx.student.updateMany({ where: { id: { in: studentIds } }, data: { current_group_id: null } });
      }
    }

    return tx.projectAllocation.delete({ where: { id } });
  });
};

// Placeholder for runAllocation - to be implemented
const runAllocation = async () => {
    logger.warn('runAllocation is not fully implemented yet.');
    return { message: "Allocation process initiated." };
};

const getAllocationStatus = async () => {
    const totalStudents = await prisma.student.count();
    const allocatedStudents = await prisma.projectAllocation.count();
    const unallocatedStudents = totalStudents - allocatedStudents;
    const totalProjects = await prisma.project.count();
    const availableProjects = await prisma.project.count({ where: { is_available: true, status: 'approved' } });

    return { totalStudents, allocatedStudents, unallocatedStudents, totalProjects, availableProjects };
};

const getAllocationResults = async () => {
    return prisma.projectAllocation.findMany({
        include: {
            project: true,
            supervisor: { include: { user: true } },
            student: { include: { user: true } },
            group: { include: { members: { include: { student: { include: { user: true } } } } } }
        }
    });
};

module.exports = {
  getAllAllocations,
  createAllocation,
  runAllocation,
  getAllocationStatus,
  getAllocationResults,
  submitPreferences,
  getMyPreferences,
  manualAllocate,
  updateAllocation,
  deleteAllocation,
};
