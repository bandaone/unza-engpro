const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get system-wide statistics
 * @returns {Promise<Object>} System statistics
 */
const getSystemStatistics = async () => {
  const [
    totalUsers,
    totalStudents,
    totalSupervisors,
    totalProjects,
    totalGroups,
    totalAllocations,
    recentLogbookEntries,
    projectStatusCounts,
    supervisorLoads,
  ] = await Promise.all([
    // User statistics
    prisma.user.count(),
    prisma.student.count(),
    prisma.supervisor.count(),
    
    // Project statistics
    prisma.project.count(),
    prisma.group.count(),
    prisma.projectAllocation.count(),
    
    // Recent activity
    prisma.logbookEntry.count({
      where: {
        created_at: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    }),

    // Project status distribution
    prisma.project.groupBy({
      by: ['status'],
      _count: true
    }),

    // Supervisor workload
    prisma.supervisor.findMany({
      select: {
        id: true,
        user: {
          select: {
            full_name: true
          }
        },
        current_load: true,
        max_capacity: true,
        _count: {
          select: {
            projects: true
          }
        }
      }
    })
  ]);

  // Calculate allocation phase distribution
  const allocationPhases = await prisma.projectAllocation.groupBy({
    by: ['allocation_phase'],
    _count: true
  });

  return {
    users: {
      total: totalUsers,
      students: totalStudents,
      supervisors: totalSupervisors,
    },
    projects: {
      total: totalProjects,
      byStatus: projectStatusCounts.reduce((acc, curr) => {
        acc[curr.status] = curr._count;
        return acc;
      }, {}),
    },
    allocations: {
      total: totalAllocations,
      byPhase: allocationPhases.reduce((acc, curr) => {
        acc[curr.allocation_phase] = curr._count;
        return acc;
      }, {}),
    },
    groups: {
      total: totalGroups,
    },
    activity: {
      recentLogbookEntries,
    },
    supervision: {
      workload: supervisorLoads.map(s => ({
        supervisorName: s.user.full_name,
        currentLoad: s.current_load,
        maxCapacity: s.max_capacity,
        projectCount: s._count.projects,
        utilizationRate: (s.current_load / s.max_capacity) * 100
      }))
    }
  };
};

/**
 * Generate allocation results report
 * @returns {Promise<Object>} Allocation report data
 */
const getAllocationReport = async () => {
  const allocations = await prisma.projectAllocation.findMany({
    include: {
      project: {
        select: {
          title: true,
          category: true,
          difficulty_level: true,
          supervisor: {
            include: {
              user: {
                select: {
                  full_name: true,
                }
              }
            }
          }
        }
      },
      supervisor: {
        include: {
          user: {
            select: {
              full_name: true,
            }
          }
        }
      }
    },
    orderBy: {
      allocated_at: 'desc'
    }
  });

  // Group allocations by phase
  const byPhase = allocations.reduce((acc, curr) => {
    if (!acc[curr.allocation_phase]) {
      acc[curr.allocation_phase] = [];
    }
    acc[curr.allocation_phase].push(curr);
    return acc;
  }, {});

  // Calculate statistics
  const statistics = {
    totalAllocations: allocations.length,
    phaseDistribution: Object.keys(byPhase).map(phase => ({
      phase,
      count: byPhase[phase].length,
      percentage: (byPhase[phase].length / allocations.length) * 100
    })),
    supervisorDistribution: {},
    projectCategoryDistribution: {},
    difficultyLevelDistribution: {}
  };

  // Process detailed statistics
  allocations.forEach(allocation => {
    // Supervisor distribution
    const supervisorName = allocation.supervisor.user.full_name;
    if (!statistics.supervisorDistribution[supervisorName]) {
      statistics.supervisorDistribution[supervisorName] = 0;
    }
    statistics.supervisorDistribution[supervisorName]++;

    // Project category distribution
    const category = allocation.project.category;
    if (!statistics.projectCategoryDistribution[category]) {
      statistics.projectCategoryDistribution[category] = 0;
    }
    statistics.projectCategoryDistribution[category]++;

    // Difficulty level distribution
    const difficulty = allocation.project.difficulty_level;
    if (!statistics.difficultyLevelDistribution[difficulty]) {
      statistics.difficultyLevelDistribution[difficulty] = 0;
    }
    statistics.difficultyLevelDistribution[difficulty]++;
  });

  return {
    statistics,
    allocationsByPhase: byPhase
  };
};

/**
 * Generate student progress report
 * @returns {Promise<Object>} Student progress report data
 */
const getStudentProgressReport = async () => {
  const students = await prisma.student.findMany({
    include: {
      user: {
        select: {
          full_name: true,
          email: true
        }
      },
      group: true,
      logbookEntries: {
        include: {
          comments: true
        },
        orderBy: {
          entry_date: 'desc'
        }
      }
    }
  });

  const progress = await Promise.all(students.map(async (student) => {
    // Get allocation details if any
    const allocation = await prisma.projectAllocation.findFirst({
      where: {
        OR: [
          { allocated_to_id: student.id, allocated_to_type: 'student' },
          { allocated_to_id: student.current_group_id, allocated_to_type: 'group' }
        ]
      },
      include: {
        project: {
          select: {
            title: true,
            supervisor: {
              include: {
                user: {
                  select: {
                    full_name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Calculate progress metrics
    const logbookMetrics = {
      totalEntries: student.logbookEntries.length,
      totalComments: student.logbookEntries.reduce((sum, entry) => sum + entry.comments.length, 0),
      lastActivity: student.logbookEntries[0]?.entry_date || null,
      averageEntriesPerWeek: 0
    };

    // Calculate average entries per week if there are entries
    if (logbookMetrics.totalEntries > 0) {
      const firstEntry = student.logbookEntries[student.logbookEntries.length - 1];
      const weeksDiff = Math.ceil((new Date() - firstEntry.entry_date) / (7 * 24 * 60 * 60 * 1000));
      logbookMetrics.averageEntriesPerWeek = logbookMetrics.totalEntries / weeksDiff;
    }

    return {
      studentId: student.id,
      fullName: student.user.full_name,
      email: student.user.email,
      group: student.group?.group_name || 'No Group',
      project: allocation?.project.title || 'Not Allocated',
      supervisor: allocation?.project.supervisor.user.full_name || 'N/A',
      progress: logbookMetrics
    };
  }));

  return {
    totalStudents: progress.length,
    studentsWithProjects: progress.filter(p => p.project !== 'Not Allocated').length,
    progressData: progress
  };
};

/**
 * Get system settings
 * @returns {Promise<Array>} System settings
 */
const getSystemSettings = async () => {
  return prisma.systemSetting.findMany({
    orderBy: {
      setting_key: 'asc'
    }
  });
};

/**
 * Update system setting
 * @param {string} key - Setting key
 * @param {string} value - Setting value
 * @param {string} updatedById - User ID making the update
 * @returns {Promise<Object>} Updated setting
 */
const updateSystemSetting = async (key, value, updatedById) => {
  return prisma.systemSetting.upsert({
    where: { setting_key: key },
    update: {
      setting_value: value,
      updated_by_id: updatedById,
      updated_at: new Date()
    },
    create: {
      setting_key: key,
      setting_value: value,
      data_type: 'string', // Default to string, can be enhanced to handle different types
      updated_by_id: updatedById
    }
  });
};

module.exports = {
  getSystemStatistics,
  getAllocationReport,
  getStudentProgressReport,
  getSystemSettings,
  updateSystemSetting
};