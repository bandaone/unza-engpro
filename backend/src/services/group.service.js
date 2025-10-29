const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const notificationService = require('./notification.service');

const getGroups = async () => {
  const groups = await prisma.group.findMany({
    include: {
      members: {
        include: {
          student: {
            include: {
              user: {
                select: {
                  full_name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      createdBy: {
        select: {
          full_name: true,
          email: true,
        },
      },
    },
  });
  return groups;
};

const pairStudents = async (studentIds, pairingMode, coordinatorId) => {
  return prisma.$transaction(async (tx) => {
    const students = await tx.student.findMany({
      where: { id: { in: studentIds } },
      include: { user: true },
    });

    if (students.length !== studentIds.length) {
      throw new Error('One or more student IDs are invalid.');
    }

    let createdGroups = [];

    if (pairingMode === 'individual') {
      for (const student of students) {
        const tempPassword = crypto.randomBytes(8).toString('hex');
        const shared_password_hash = await bcrypt.hash(tempPassword, 10);
        const groupId = `GRP_${new Date().getFullYear()}_${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

        const newGroup = await tx.group.create({
          data: {
            group_id: groupId,
            shared_password_hash,
            created_by_id: coordinatorId,
            members: {
              create: {
                student_id: student.id,
                role: 'leader',
              },
            },
          },
        });

        await tx.student.update({
          where: { id: student.id },
          data: { current_group_id: newGroup.id },
        });
        createdGroups.push({ group: newGroup, members: [student], tempPassword });
      }
    } else if (pairingMode === 'pairs') {
      const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffledStudents.length; i += 2) {
        const pair = [shuffledStudents[i]];
        if (shuffledStudents[i + 1]) {
          pair.push(shuffledStudents[i + 1]);
        }

        const tempPassword = crypto.randomBytes(8).toString('hex');
        const shared_password_hash = await bcrypt.hash(tempPassword, 10);
        const groupId = `GRP_${new Date().getFullYear()}_${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

        const newGroup = await tx.group.create({
          data: {
            group_id: groupId,
            shared_password_hash,
            created_by_id: coordinatorId,
            members: {
              create: pair.map((s, index) => ({
                student_id: s.id,
                role: index === 0 ? 'leader' : 'member',
              })),
            },
          },
        });

        for (const s of pair) {
          await tx.student.update({
            where: { id: s.id },
            data: { current_group_id: newGroup.id },
          });
        }
        // Send notifications to group members
        await notificationService.notifyGroupFormation({
          id: groupId,
          group_name: `Group ${groupId}`,
          members: pair.map(s => ({
            student: {
              user: {
                id: s.id,
                full_name: s.user.full_name,
                email: s.user.email
              }
            }
          }))
        });

        createdGroups.push({ group: newGroup, members: pair, tempPassword });
      }
    } else if (pairingMode === 'mixed') {
      // For 'mixed' mode, we'll assume a simple grouping of 3 for now, or remaining students
      const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
      let studentIndex = 0;
      while (studentIndex < shuffledStudents.length) {
        const groupSize = Math.min(3, shuffledStudents.length - studentIndex);
        const groupMembers = shuffledStudents.slice(studentIndex, studentIndex + groupSize);

        const tempPassword = crypto.randomBytes(8).toString('hex');
        const shared_password_hash = await bcrypt.hash(tempPassword, 10);
        const groupId = `GRP_${new Date().getFullYear()}_${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

        const newGroup = await tx.group.create({
          data: {
            group_id: groupId,
            shared_password_hash,
            created_by_id: coordinatorId,
            members: {
              create: groupMembers.map((s, index) => ({
                student_id: s.id,
                role: index === 0 ? 'leader' : 'member',
              })),
            },
          },
        });

        for (const s of groupMembers) {
          await tx.student.update({
            where: { id: s.id },
            data: { current_group_id: newGroup.id },
          });
        }
        createdGroups.push({ group: newGroup, members: groupMembers, tempPassword });
        studentIndex += groupSize;
      }
    }

    return createdGroups;
  });
};

const getGroupById = async (id) => {
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          student: {
            include: {
              user: {
                select: {
                  full_name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      createdBy: {
        select: {
          full_name: true,
          email: true,
        },
      },
    },
  });
  return group;
};

const updateGroup = async (id, groupData) => {
  const { group_name, is_active, memberUpdates } = groupData;

  return prisma.$transaction(async (tx) => {
    // 1. Update basic group details
    const updatedGroup = await tx.group.update({
      where: { id },
      data: {
        group_name: group_name || undefined,
        is_active: is_active !== undefined ? is_active : undefined,
        updated_at: new Date(),
      },
    });

    // 2. Process member updates
    if (memberUpdates && Array.isArray(memberUpdates)) {
      for (const update of memberUpdates) {
        const { studentId, action, role } = update;

        if (action === 'add') {
          // Check if student is already in a group
          const student = await tx.student.findUnique({ where: { id: studentId } });
          if (student && student.current_group_id) {
            throw new Error(`Student ${studentId} is already in a group.`);
          }

          await tx.groupMember.create({
            data: {
              group_id: id,
              student_id: studentId,
              role: role || 'member',
            },
          });
          await tx.student.update({
            where: { id: studentId },
            data: { current_group_id: id },
          });
        } else if (action === 'remove') {
          await tx.groupMember.deleteMany({
            where: { group_id: id, student_id: studentId },
          });
          await tx.student.update({
            where: { id: studentId },
            data: { current_group_id: null },
          });
        } else if (action === 'update') {
          await tx.groupMember.updateMany({
            where: { group_id: id, student_id: studentId },
            data: { role: role },
          });
        }
      }
    }

    // 3. Return the fully updated group with members
    return getGroupById(id);
  });
};

const deleteGroup = async (id) => {
  return prisma.$transaction(async (tx) => {
    // 1. Find all students in this group and set their current_group_id to null
    await tx.student.updateMany({
      where: { current_group_id: id },
      data: { current_group_id: null },
    });

    // 2. Delete all group members associated with this group
    await tx.groupMember.deleteMany({
      where: { group_id: id },
    });

    // 3. Delete the group itself
    const deletedGroup = await tx.group.delete({
      where: { id },
    });

    return deletedGroup;
  });
};

const requestGroupSplit = async (groupId, studentId, reason) => {
  // 1. Validate group and student exist
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    throw new Error('Group not found.');
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) {
    throw new Error('Student not found.');
  }

  // 2. Check if the student is actually a member of this group
  const isMember = await prisma.groupMember.findFirst({
    where: { group_id: groupId, student_id: studentId },
  });

  if (!isMember) {
    throw new Error('Student is not a member of this group.');
  }

  // 3. Check if there's an existing pending split request for this student/group
  const existingRequest = await prisma.splitRequest.findFirst({
    where: {
      requester_id: studentId,
      group_id: groupId,
      status: 'pending',
    },
  });

  if (existingRequest) {
    throw new Error('A pending split request already exists for this student in this group.');
  }

  // 4. Create the new split request
  const newSplitRequest = await prisma.splitRequest.create({
    data: {
      requester_id: studentId,
      group_id: groupId,
      reason,
      status: 'pending',
    },
  });

  return newSplitRequest;
};

const approveGroupSplit = async (splitRequestId, coordinatorId) => {
  return prisma.$transaction(async (tx) => {
    // 1. Find the split request
    const splitRequest = await tx.splitRequest.findUnique({
      where: { id: splitRequestId },
      include: { requester: true, group: true, proposedProject: true },
    });

    if (!splitRequest) {
      throw new Error('Split request not found.');
    }
    if (splitRequest.status !== 'pending') {
      throw new Error('Split request is not in a pending state.');
    }

    // 2. Update the split request status
    await tx.splitRequest.update({
      where: { id: splitRequestId },
      data: {
        status: 'approved',
        reviewed_by_id: coordinatorId,
        reviewed_at: new Date(),
      },
    });

    // 3. Remove student from the original group
    await tx.groupMember.deleteMany({
      where: { group_id: splitRequest.group_id, student_id: splitRequest.requester_id },
    });
    await tx.student.update({
      where: { id: splitRequest.requester_id },
      data: { current_group_id: null },
    });

    let newGroup = null;
    let newAllocation = null;

    // 4. If a proposed project exists, create a new individual group and allocate the project
    if (splitRequest.proposed_project_id && splitRequest.proposedProject) {
      const tempPassword = crypto.randomBytes(8).toString('hex');
      const shared_password_hash = await bcrypt.hash(tempPassword, 10);
      const groupId = `GRP_${new Date().getFullYear()}_${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      newGroup = await tx.group.create({
        data: {
          group_id: groupId,
          shared_password_hash,
          created_by_id: coordinatorId,
          group_name: `Individual Group for ${splitRequest.requester.user.full_name}`,
          members: {
            create: {
              student_id: splitRequest.requester_id,
              role: 'leader',
            },
          },
        },
      });

      await tx.student.update({
        where: { id: splitRequest.requester_id },
        data: { current_group_id: newGroup.id },
      });

      // Create project allocation for the new individual group
      newAllocation = await tx.projectAllocation.create({
        data: {
          project_id: splitRequest.proposed_project_id,
          allocated_to_type: 'student',
          allocated_to_id: splitRequest.requester_id,
          supervisor_id: splitRequest.proposedProject.supervisor_id,
          allocated_by_id: coordinatorId,
          allocation_phase: 'override', // Or 'manual' depending on policy
          status: 'active',
        },
      });
    }

    return { splitRequest, newGroup, newAllocation };
  });
};

const rejectGroupSplit = async (splitRequestId, coordinatorId, reviewNotes) => {
  return prisma.$transaction(async (tx) => {
    // 1. Find the split request
    const splitRequest = await tx.splitRequest.findUnique({
      where: { id: splitRequestId },
    });

    if (!splitRequest) {
      throw new Error('Split request not found.');
    }
    if (splitRequest.status !== 'pending') {
      throw new Error('Split request is not in a pending state.');
    }

    // 2. Update the split request status
    const rejectedSplitRequest = await tx.splitRequest.update({
      where: { id: splitRequestId },
      data: {
        status: 'rejected',
        reviewed_by_id: coordinatorId,
        reviewed_at: new Date(),
        review_notes: reviewNotes,
      },
    });

    return rejectedSplitRequest;
  });
};

module.exports = {
  getGroups,
  pairStudents,
  getGroupById,
  updateGroup,
  deleteGroup,
  requestGroupSplit,
  approveGroupSplit,
  rejectGroupSplit,
};
