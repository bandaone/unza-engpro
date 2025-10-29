const prisma = require('../config/prisma');
const mammoth = require('mammoth');
const { ApiError } = require('../utils/errors');
const logger = require('../utils/logger');
const notificationService = require('./notification.service');

class ProjectProposalService {
  /**
   * Extract text content from Word document
   */
  async extractWordContent(buffer) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      logger.error('Error extracting Word content:', error);
      throw new ApiError('Failed to extract content from Word document', 500);
    }
  }

  /**
   * Parse project proposal from Word document content
   */
  parseProposalContent(content) {
    try {
      const sections = content.split(/\n{2,}/);
      const proposal = {
        title: '',
        description: '',
        objectives: [],
        expectedOutcomes: [],
        requiredSkills: [],
        prerequisites: '',
        category: '',
        difficultyLevel: 'intermediate'
      };

      let currentSection = '';
      for (const section of sections) {
        const trimmedSection = section.trim();
        
        if (trimmedSection.toLowerCase().includes('title:')) {
          proposal.title = trimmedSection.replace(/title:/i, '').trim();
        }
        else if (trimmedSection.toLowerCase().includes('description:')) {
          proposal.description = trimmedSection.replace(/description:/i, '').trim();
        }
        else if (trimmedSection.toLowerCase().includes('objectives:')) {
          const objectivesText = trimmedSection.replace(/objectives:/i, '').trim();
          proposal.objectives = objectivesText.split(/\n|•/).filter(o => o.trim());
        }
        else if (trimmedSection.toLowerCase().includes('expected outcomes:')) {
          const outcomesText = trimmedSection.replace(/expected outcomes:/i, '').trim();
          proposal.expectedOutcomes = outcomesText.split(/\n|•/).filter(o => o.trim());
        }
        else if (trimmedSection.toLowerCase().includes('required skills:')) {
          const skillsText = trimmedSection.replace(/required skills:/i, '').trim();
          proposal.requiredSkills = skillsText.split(/\n|•|,/).map(s => s.trim()).filter(Boolean);
        }
        else if (trimmedSection.toLowerCase().includes('prerequisites:')) {
          proposal.prerequisites = trimmedSection.replace(/prerequisites:/i, '').trim();
        }
        else if (trimmedSection.toLowerCase().includes('category:')) {
          proposal.category = trimmedSection.replace(/category:/i, '').trim();
        }
        else if (trimmedSection.toLowerCase().includes('difficulty:')) {
          const difficulty = trimmedSection.replace(/difficulty:/i, '').trim().toLowerCase();
          if (['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
            proposal.difficultyLevel = difficulty;
          }
        }
      }

      if (!proposal.title || !proposal.description) {
        throw new ApiError('Invalid proposal format: Missing title or description', 400);
      }

      return proposal;
    } catch (error) {
      logger.error('Error parsing proposal content:', error);
      throw new ApiError('Failed to parse project proposal', 400);
    }
  }

  /**
   * Create project proposal from parsed content
   */
  async createProposal(proposalData, file, userId) {
    const wordContent = await this.extractWordContent(file.buffer);
    const parsedProposal = this.parseProposalContent(wordContent);

    // Merge parsed content with any additional provided data
    const projectData = {
      ...parsedProposal,
      ...proposalData,
      source: 'student_proposed',
      status: 'pending_approval',
      createdById: userId
    };

    return await prisma.$transaction(async (tx) => {
      // Create project
      const project = await tx.project.create({
        data: {
          title: projectData.title,
          description: projectData.description,
          objectives: projectData.objectives,
          expectedOutcomes: projectData.expectedOutcomes,
          category: projectData.category,
          difficultyLevel: projectData.difficultyLevel,
          requiredSkills: projectData.requiredSkills,
          prerequisites: projectData.prerequisites,
          maxStudents: projectData.maxStudents || 2,
          supervisorId: projectData.supervisorId,
          source: projectData.source,
          status: projectData.status,
          createdById: projectData.createdById
        }
      });

      // Store the original file info
      await tx.projectDocument.create({
        data: {
          projectId: project.id,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedById: userId
        }
      });

      // Notify supervisor
      const supervisor = await tx.supervisor.findUnique({
        where: { id: projectData.supervisorId },
        include: { user: true }
      });

      await notificationService.createNotification({
        userId: supervisor.user.id,
        title: 'New Project Proposal',
        message: `A new project proposal "${project.title}" requires your review`,
        type: 'info',
        relatedEntityType: 'project',
        relatedEntityId: project.id
      });

      return project;
    });
  }

  /**
   * Get project proposal by ID
   */
  async getProposal(proposalId, userId) {
    const proposal = await prisma.project.findUnique({
      where: { id: proposalId },
      include: {
        supervisor: {
          include: { user: true }
        },
        createdBy: {
          include: { user: true }
        },
        documents: true
      }
    });

    if (!proposal) {
      throw new ApiError('Project proposal not found', 404);
    }

    return proposal;
  }

  /**
   * Update project proposal status
   */
  async updateProposalStatus(proposalId, status, reviewNotes, reviewerId) {
    const proposal = await prisma.project.findUnique({
      where: { id: proposalId },
      include: {
        createdBy: {
          include: { user: true }
        }
      }
    });

    if (!proposal) {
      throw new ApiError('Project proposal not found', 404);
    }

    const updatedProposal = await prisma.$transaction(async (tx) => {
      // Update project status
      const updated = await tx.project.update({
        where: { id: proposalId },
        data: {
          status,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          reviewNotes
        }
      });

      // Create review record
      await tx.projectReview.create({
        data: {
          projectId: proposalId,
          reviewerId,
          status,
          notes: reviewNotes
        }
      });

      // Notify proposal creator
      await notificationService.createNotification({
        userId: proposal.createdBy.id,
        title: 'Project Proposal Update',
        message: `Your project proposal "${proposal.title}" has been ${status}${reviewNotes ? `: ${reviewNotes}` : ''}`,
        type: status === 'approved' ? 'success' : 'warning',
        relatedEntityType: 'project',
        relatedEntityId: proposalId
      });

      return updated;
    });

    return updatedProposal;
  }

  /**
   * Get all proposals for review
   */
  async getProposalsForReview(filters = {}) {
    return await prisma.project.findMany({
      where: {
        source: 'student_proposed',
        status: filters.status || 'pending_approval',
        ...(filters.supervisorId && { supervisorId: filters.supervisorId }),
        ...(filters.category && { category: filters.category })
      },
      include: {
        supervisor: {
          include: { user: true }
        },
        createdBy: {
          include: { user: true }
        },
        documents: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
}

module.exports = new ProjectProposalService();