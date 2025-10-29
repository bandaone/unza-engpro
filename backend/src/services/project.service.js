const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const mammoth = require('mammoth'); // Import mammoth for Word document parsing
const notificationService = require('./notification.service');

const getProjects = async () => {
  const projects = await prisma.project.findMany({
    include: {
      supervisor: {
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
  });
  return projects;
};

const createProject = async (projectData, userId) => {
  const {
    title,
    description,
    objectives,
    expected_outcomes,
    category,
    difficulty_level,
    required_skills,
    prerequisites,
    max_students,
    is_available,
    supervisor_id,
    source,
    status,
  } = projectData;

  // 1. Validate supervisor_id
  const supervisor = await prisma.supervisor.findUnique({
    where: { id: supervisor_id },
  });

  if (!supervisor) {
    throw new Error('Supervisor not found.');
  }

  // 2. Create the project
  const newProject = await prisma.project.create({
    data: {
      title,
      description,
      objectives,
      expected_outcomes,
      category,
      difficulty_level: difficulty_level || 'intermediate', // Default difficulty
      required_skills: required_skills || [],
      prerequisites,
      max_students: max_students || 1,
      is_available: is_available !== undefined ? is_available : true,
      created_by_id: userId,
      supervisor_id,
      source: source || 'school_listed', // Default source
      status: status || 'approved', // Default status for created projects
      approved_at: new Date(), // Set approved_at for approved projects
    },
    include: {
      supervisor: {
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
  });

  return newProject;
};

const importProjectsFromWord = async (wordBuffer, userId) => {
  const { value: text } = await mammoth.extractRawText({ buffer: wordBuffer });
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  let createdCount = 0;
  let failedCount = 0;
  const errors = [];

  // Define a simple parsing state machine or regex to extract project data
  // Assuming projects are separated by a clear header, e.g., "PROJECT TITLE: "
  // And details follow in key-value pairs.

  const projectsToCreate = [];
  let currentProject = {};

  for (const line of lines) {
    if (line.startsWith('PROJECT TITLE:')) {
      if (Object.keys(currentProject).length > 0) {
        projectsToCreate.push(currentProject);
      }
      currentProject = {
        title: line.replace('PROJECT TITLE:', '').trim(),
        required_skills: [],
        source: 'school_listed',
        status: 'approved',
        max_students: 1,
        difficulty_level: 'intermediate',
      };
    } else if (currentProject.title) {
      if (line.startsWith('Description:')) {
        currentProject.description = line.replace('Description:', '').trim();
      } else if (line.startsWith('Objectives:')) {
        currentProject.objectives = line.replace('Objectives:', '').trim();
      } else if (line.startsWith('Expected Outcomes:')) {
        currentProject.expected_outcomes = line.replace('Expected Outcomes:', '').trim();
      } else if (line.startsWith('Category:')) {
        currentProject.category = line.replace('Category:', '').trim();
      } else if (line.startsWith('Difficulty:')) {
        currentProject.difficulty_level = line.replace('Difficulty:', '').trim().toLowerCase();
      } else if (line.startsWith('Required Skills:')) {
        currentProject.required_skills = line.replace('Required Skills:', '').split(',').map(s => s.trim()).filter(s => s.length > 0);
      } else if (line.startsWith('Prerequisites:')) {
        currentProject.prerequisites = line.replace('Prerequisites:', '').trim();
      } else if (line.startsWith('Max Students:')) {
        currentProject.max_students = parseInt(line.replace('Max Students:', '').trim(), 10);
      } else if (line.startsWith('Supervisor Email:')) {
        currentProject.supervisorEmail = line.replace('Supervisor Email:', '').trim();
      }
      // Add more fields as needed based on expected Word document structure
    }
  }
  if (Object.keys(currentProject).length > 0) {
    projectsToCreate.push(currentProject);
  }

  await prisma.$transaction(async (tx) => {
    for (const projectData of projectsToCreate) {
      try {
        if (!projectData.title || !projectData.description || !projectData.supervisorEmail) {
          throw new Error(`Missing required fields for project: ${projectData.title || 'Unknown'}`);
        }

        const supervisorUser = await tx.user.findUnique({
          where: { email: projectData.supervisorEmail },
          include: { supervisor: true },
        });

        if (!supervisorUser || !supervisorUser.supervisor) {
          throw new Error(`Supervisor with email ${projectData.supervisorEmail} not found or is not a supervisor.`);
        }

        await tx.project.create({
          data: {
            title: projectData.title,
            description: projectData.description,
            objectives: projectData.objectives,
            expected_outcomes: projectData.expected_outcomes,
            category: projectData.category,
            difficulty_level: projectData.difficulty_level,
            required_skills: projectData.required_skills,
            prerequisites: projectData.prerequisites,
            max_students: projectData.max_students,
            is_available: true,
            created_by_id: userId,
            supervisor_id: supervisorUser.supervisor.id,
            source: 'school_listed', // Projects imported from Word are school-listed
            status: 'approved', // Projects imported from Word are approved
            approved_at: new Date(),
          },
        });
        createdCount++;
      } catch (e) {
        failedCount++;
        errors.push(`Failed to import project "${projectData.title || 'Unknown'}": ${e.message}`);
        // Log the error but continue with other projects in the transaction
        console.error(`Error importing project: ${e.message}`);
      }
    }
  });

  return { createdCount, failedCount, errors };
};

const getAvailableProjects = async () => {
  const projects = await prisma.project.findMany({
    where: {
      is_available: true,
      status: 'approved',
    },
    include: {
      supervisor: {
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
  });
  return projects;
};

const getProjectById = async (id) => {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      supervisor: {
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
  });
  return project;
};

const updateProject = async (id, projectData) => {
  const { supervisor_id, ...dataToUpdate } = projectData;

  // If supervisor_id is provided, validate it
  if (supervisor_id) {
    const supervisor = await prisma.supervisor.findUnique({
      where: { id: supervisor_id },
    });
    if (!supervisor) {
      throw new Error('Supervisor not found.');
    }
  }

  const updatedProject = await prisma.project.update({
    where: { id },
    data: { ...dataToUpdate, supervisor_id },
    include: {
      supervisor: {
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
  });

  return updatedProject;
};

const deleteProject = async (id) => {
  await prisma.project.delete({
    where: { id },
  });
};

const proposeProject = async (projectData, userId) => {
  const {
    title,
    description,
    objectives,
    expected_outcomes,
    category,
    difficulty_level,
    required_skills,
    prerequisites,
    max_students,
    supervisor_id,
  } = projectData;

  // 1. Validate supervisor_id if provided
  if (supervisor_id) {
    const supervisor = await prisma.supervisor.findUnique({
      where: { id: supervisor_id },
    });
    if (!supervisor) {
      throw new Error('Proposed supervisor not found.');
    }
  }

  // 2. Create the proposed project
  const newProject = await prisma.project.create({
    data: {
      title,
      description,
      objectives,
      expected_outcomes,
      category,
      difficulty_level: difficulty_level || 'intermediate',
      required_skills: required_skills || [],
      prerequisites,
      max_students: max_students || 1,
      is_available: false, // Proposed projects are not immediately available
      created_by_id: userId,
      supervisor_id: supervisor_id || null, // Can be null if student doesn't propose one
      source: 'student_proposed',
      status: 'pending_approval',
    },
    include: {
      supervisor: {
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
  });

  return newProject;
};

const approveProject = async (id) => {
  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project) {
    throw new Error('Project not found.');
  }

  if (project.status === 'approved') {
    throw new Error('Project is already approved.');
  }

  const approvedProject = await prisma.project.update({
    where: { id },
    data: {
      status: 'approved',
      approved_at: new Date(),
      is_available: true, // Make it available once approved
    },
    include: {
      supervisor: {
        include: {
          user: {
            select: {
              full_name: true,
              email: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          email: true,
          full_name: true,
        },
      },
    },
  });

  // Send notifications to relevant parties
  await notificationService.notifyProjectProposalStatus(approvedProject, 'approved');

  return approvedProject;
};

const rejectProject = async (id, reason) => {
  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project) {
    throw new Error('Project not found.');
  }

  if (project.status === 'rejected') {
    throw new Error('Project is already rejected.');
  }

  const rejectedProject = await prisma.project.update({
    where: { id },
    data: {
      status: 'rejected',
      rejection_reason: reason,
      is_available: false, // Rejected projects are not available
    },
    include: {
      supervisor: {
        include: {
          user: {
            select: {
              full_name: true,
              email: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          email: true,
          full_name: true,
        },
      },
    },
  });

  // Send notifications to relevant parties
  await notificationService.notifyProjectProposalStatus(rejectedProject, 'rejected');

  return rejectedProject;
};

const getMyAllocatedProjects = async (userId, userRole) => {
  let allocatedProjects = [];

  if (userRole === 'student') {
    // Find allocations for the student
    const studentAllocations = await prisma.projectAllocation.findMany({
      where: {
        allocated_to_id: userId,
        allocated_to_type: 'student',
      },
      include: {
        project: {
          include: {
            supervisor: {
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
      },
    });
    allocatedProjects = studentAllocations.map(alloc => ({ ...alloc.project, allocation_details: alloc }));
  } else if (userRole === 'supervisor') {
    // Find projects supervised by the supervisor
    const supervisedProjects = await prisma.project.findMany({
      where: {
        supervisor_id: userId,
      },
      include: {
        allocations: {
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
            group: {
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
              },
            },
          },
        },
        supervisor: {
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
    });
    allocatedProjects = supervisedProjects.map(project => ({
      ...project,
      allocated_students_or_groups: project.allocations.map(alloc => ({
        type: alloc.allocated_to_type,
        details: alloc.allocated_to_type === 'student' ? alloc.student : alloc.group,
      })),
    }));
  }

  return allocatedProjects;
};

module.exports = {
  getProjects,
  createProject,
  importProjectsFromWord,
  getAvailableProjects,
  getProjectById,
  updateProject,
  deleteProject,
  proposeProject,
  approveProject,
  rejectProject,
  getMyAllocatedProjects,
};
