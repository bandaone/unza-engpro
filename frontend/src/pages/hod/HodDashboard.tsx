import React from 'react';
import {
  Grid as MuiGrid,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Box,
} from '@mui/material';
import {
  Warning,
  CheckCircle,
  School,
  Group,
  Person,
} from '@mui/icons-material';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/apiService';
import { useAuthStore } from '../../stores/authStore';
import { DepartmentStats, Issue } from '../../types';

const Grid = MuiGrid;

const defaultStats: DepartmentStats = {
  coursesCount: 0,
  groupsCount: 0,
  lecturersCount: 0,
  validationStatus: { courses: true, groups: true, lecturers: true, labs: true },
};

export const HodDashboard: React.FC = () => {
  const { user } = useAuthStore();

  const { data: departmentStats } = useQuery({
    queryKey: ['departmentStats', user?.department],
    queryFn: () => apiService.departments.getStats(user?.department || ''),
    enabled: !!user?.department,
    initialData: defaultStats,
  });

  const { data: issues } = useQuery({
    queryKey: ['departmentIssues', user?.department],
    queryFn: () => apiService.departments.validate(user?.department || ''),
    enabled: !!user?.department,
    initialData: [],
  });

  return (
    <DashboardLayout title={`${user?.department} Department Dashboard`}>
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Courses
            </Typography>
            <Typography variant="h4">
              {departmentStats?.coursesCount || 0}
            </Typography>
            <Button
              variant="text"
              startIcon={<School />}
              href="/hod/courses"
            >
              Manage Courses
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Groups
            </Typography>
            <Typography variant="h4">
              {departmentStats?.groupsCount || 0}
            </Typography>
            <Button
              variant="text"
              startIcon={<Group />}
              href="/hod/groups"
            >
              Manage Groups
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Lecturers
            </Typography>
            <Typography variant="h4">
              {departmentStats?.lecturersCount || 0}
            </Typography>
            <Button
              variant="text"
              startIcon={<Person />}
              href="/hod/lecturers"
            >
              Manage Lecturers
            </Button>
          </Paper>
        </Grid>

        {/* Issues Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Department Issues
            </Typography>
            <List>
              {(issues || []).map((issue: Issue) => (
                <ListItem key={issue.id}>
                  <ListItemIcon>
                    {issue.severity === 'error' ? (
                      <Warning color="error" />
                    ) : (
                      <CheckCircle color="warning" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={issue.message}
                    secondary={`Status: ${issue.status}`}
                  />
                </ListItem>
              ))}
              {(issues || []).length === 0 && (
                <ListItem>
                  <ListItemText primary="No current issues" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Validation Status */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Data Validation Status
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                Course Assignments: {departmentStats?.validationStatus?.courses ? '✓' : '⚠️'}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Group Sizes: {departmentStats?.validationStatus?.groups ? '✓' : '⚠️'}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Lecturer Availability: {departmentStats?.validationStatus?.lecturers ? '✓' : '⚠️'}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Lab Requirements: {departmentStats?.validationStatus?.labs ? '✓' : '⚠️'}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </DashboardLayout>
  );
};
