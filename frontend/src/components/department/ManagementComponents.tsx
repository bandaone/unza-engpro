import React, { useState } from 'react';
import {
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/apiService';
import { Course, Group, Lecturer } from '../../types';
import { CourseInput, GroupInput, LecturerInput } from '../../types/dialog';
import { CourseDialog } from '../dialogs/CourseDialog';
import { GroupDialog } from '../dialogs/GroupDialog';
import { LecturerDialog } from '../dialogs/LecturerDialog';

import {
  Add as AddIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';

// Course Management Component
const CourseManagement: React.FC<{ courses: Course[]; department: string }> = ({ courses, department }) => {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: lecturers = [] } = useQuery({
    queryKey: ['lecturers', department],
    queryFn: () => apiService.lecturers.getAll(),
    enabled: dialogOpen,
    initialData: [],
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups', department],
    queryFn: () => apiService.groups.getAll(),
    enabled: dialogOpen,
    initialData: [],
  });

  const handleSave = async (courseData: CourseInput) => {
    try {
      if (selectedCourse?.id) {
        await apiService.courses.update(selectedCourse.id, courseData);
      } else {
        await apiService.courses.create(courseData as Course);
      }
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['courses', department] });
    } catch (error) {
      console.error('Failed to save course:', error);
    }
  };

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">Course Management</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => {
            setSelectedCourse(null);
            setDialogOpen(true);
          }}
        >
          Add Course
        </Button>
        <List>
          {courses.map((course) => (
            <ListItem key={course.id}>
              <ListItemText
                primary={`${course.code} - ${course.name}`}
                secondary={`Hours: ${course.weekly_hours} | Lab: ${course.has_lab ? 'Yes' : 'No'}`}
              />
              <ListItemSecondaryAction>
                <IconButton onClick={() => {
                  setSelectedCourse(course);
                  setDialogOpen(true);
                }}>
                  <EditIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
        {dialogOpen && (
          <CourseDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            course={selectedCourse}
            onSave={handleSave}
            department={department}
            lecturers={lecturers}
            groups={groups}
          />
        )}
      </AccordionDetails>
    </Accordion>
  );
};

// Group Management Component
const GroupManagement: React.FC<{ groups: Group[]; department: string }> = ({ groups, department }) => {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async (groupData: GroupInput) => {
    try {
      if (selectedGroup?.id) {
        await apiService.groups.update(selectedGroup.id, groupData);
      } else {
        await apiService.groups.create(groupData as Group);
      }
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['groups', department] });
    } catch (error) {
      console.error('Failed to save group:', error);
    }
  };

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">Group Management</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => {
            setSelectedGroup(null);
            setDialogOpen(true);
          }}
        >
          Add Group
        </Button>
        <List>
          {groups.map((group) => (
            <ListItem key={group.id}>
              <ListItemText
                primary={group.name}
                secondary={`Capacity: ${group.capacity}`}
              />
              <ListItemSecondaryAction>
                <IconButton onClick={() => {
                  setSelectedGroup(group);
                  setDialogOpen(true);
                }}>
                  <EditIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
        {dialogOpen && (
          <GroupDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            group={selectedGroup}
            onSave={handleSave}
            department={department}
          />
        )}
      </AccordionDetails>
    </Accordion>
  );
};

// Lecturer Management Component
const LecturerManagement: React.FC<{ lecturers: Lecturer[]; department: string }> = ({ lecturers, department }) => {
  const [selectedLecturer, setSelectedLecturer] = useState<Lecturer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async (lecturerData: LecturerInput) => {
    try {
      if (selectedLecturer?.id) {
        await apiService.lecturers.update(selectedLecturer.id, lecturerData);
      } else {
        await apiService.lecturers.create(lecturerData as Lecturer);
      }
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['lecturers', department] });
    } catch (error) {
      console.error('Failed to save lecturer:', error);
    }
  };

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">Lecturer Management</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => {
            setSelectedLecturer(null);
            setDialogOpen(true);
          }}
        >
          Add Lecturer
        </Button>
        <List>
          {lecturers.map((lecturer) => (
            <ListItem key={lecturer.id}>
              <ListItemText
                primary={lecturer.name}
                secondary={lecturer.email}
              />
              <ListItemSecondaryAction>
                <IconButton onClick={() => {
                  setSelectedLecturer(lecturer);
                  setDialogOpen(true);
                }}>
                  <EditIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
        {dialogOpen && (
          <LecturerDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            lecturer={selectedLecturer}
            onSave={handleSave}
            department={department}
          />
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export { CourseManagement, GroupManagement, LecturerManagement };
