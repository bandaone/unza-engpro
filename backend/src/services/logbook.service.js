const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class LogbookService {
  async getLogbookEntries(projectId, userId, userRole) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        supervisor: true,
        allocations: true
      }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Check if user has access
    const canAccess = 
      userRole === 'coordinator' ||
      project.supervisor_id === userId ||
      project.allocations.some(a => a.allocated_to_id === userId);

    if (!canAccess) {
      throw new Error('Not authorized to view this logbook');
    }

    return prisma.logbookEntry.findMany({
      where: { project_id: projectId },
      include: {
        author: {
          select: { full_name: true }
        },
        comments: {
          include: {
            author: {
              select: { full_name: true, role: true }
            }
          },
          orderBy: {
            created_at: 'asc'
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async createEntry(projectId, userId, entryData) {
    // Check project exists and user has access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        allocations: {
          some: { allocated_to_id: userId }
        }
      }
    });

    if (!project) {
      throw new Error('Project not found or not authorized');
    }

    return prisma.logbookEntry.create({
      data: {
        project_id: projectId,
        author_id: userId,
        entry_date: new Date(),
        content: entryData.entry
      },
      include: {
        author: {
          select: { full_name: true }
        }
      }
    });
  }

  async addComment(entryId, userId, commentData) {
    const entry = await prisma.logbookEntry.findUnique({
      where: { id: entryId },
      include: {
        project: {
          include: {
            supervisor: true,
            allocations: true
          }
        }
      }
    });

    if (!entry) {
      throw new Error('Logbook entry not found');
    }

    // Only supervisor can comment
    if (entry.project.supervisor_id !== userId) {
      throw new Error('Only supervisors can add comments');
    }

    return prisma.logbookComment.create({
      data: {
        logbook_entry_id: entryId,
        author_id: userId,
        comment_text: commentData.comment
      },
      include: {
        author: {
          select: { full_name: true, role: true }
        }
      }
    });
  }

  async updateEntry(entryId, userId, entryData) {
    const entry = await prisma.logbookEntry.findUnique({
      where: { id: entryId }
    });

    if (!entry || entry.author_id !== userId) {
      throw new Error('Entry not found or not authorized to update');
    }

    // Only allow updates within 24 hours of creation
    const hoursSinceCreation = Math.abs(new Date() - entry.created_at) / 36e5;
    if (hoursSinceCreation > 24) {
      throw new Error('Entries can only be updated within 24 hours of creation');
    }

    return prisma.logbookEntry.update({
      where: { id: entryId },
      data: {
        content: entryData.entry,
        updated_at: new Date()
      }
    });
  }
}

module.exports = new LogbookService();