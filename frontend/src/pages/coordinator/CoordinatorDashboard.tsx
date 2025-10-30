import React from 'react';
import {
  Grid,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Box,
  Chip,
} from '@mui/material';
import {
  Warning,
  Room,
  Schedule,
  School,
  CheckCircle,
} from '@mui/icons-material';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/apiService';
import { GlobalStats, Issue, Department } from '../../types';

const defaultGlobalStats: GlobalStats = {
  roomsCount: 0,
  departmentsCount: 0,
  timetableStatus: 'Not Generated',
  resourceUtilization: { rooms: 0, labs: 0, equipment: 0 },
  issues: [],
};

export const CoordinatorDashboard: React.FC = () => {
  const { data: globalStats = defaultGlobalStats } = useQuery<GlobalStats>({
    queryKey: ['globalStats'],
    queryFn: () => apiService.stats.getGlobal(),
  });

  const { data: issues = [] } = useQuery<Issue[]>({
    queryKey: ['globalIssues'],
    queryFn: () => apiService.stats.getGlobalIssues(),
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => apiService.departments.getAll(),
  });

  const safeDepartments = departments || [];
  const safeIssues = issues || [];
  const safeGlobalStats = globalStats || defaultGlobalStats;

  return (
    <DashboardLayout title="Coordinator Dashboard">
      <Grid container spacing={3}>
        {/* Global Stats */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Total Rooms
            </Typography>
            <Typography variant="h4">{safeGlobalStats.roomsCount}</Typography>
            <Button variant="text" startIcon={<Room />} href="/coordinator/resources">
              Manage Resources
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Departments
            </Typography>
            <Typography variant="h4">{safeDepartments.length}</Typography>
            <Button variant="text" startIcon={<School />} href="/coordinator/departments">
              View Departments
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Active Issues
            </Typography>
            <Typography variant="h4" color={safeIssues.length > 0 ? 'error' : 'success'}>
              {safeIssues.length}
            </Typography>
            <Button variant="text" startIcon={<Warning />} href="/coordinator/issues">
              View Issues
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Timetable Status
            </Typography>
            <Chip
              label={safeGlobalStats.timetableStatus}
              color={safeGlobalStats.timetableStatus === 'Generated' ? 'success' : 'warning'}
            />
            <Button variant="text" startIcon={<Schedule />} href="/coordinator/timetable" sx={{ mt: 1 }}>
              View Timetable
            </Button>
          </Paper>
        </Grid>

        {/* Department Status */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Department Status
            </Typography>
            <List>
              {safeDepartments.map((dept: Department) => (
                <ListItem key={dept.code}>
                  <ListItemIcon>
                    {dept.validation_status === 'valid' ? (
                      <CheckCircle color="success" />
                    ) : (
                      <Warning color={dept.validation_status === 'warning' ? 'warning' : 'error'} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={`${dept.code} - ${dept.name}`}
                    secondary={`Issues: ${dept.issues_count || 0} | Courses: ${dept.courses_count || 0}`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Resource Utilization */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Resource Utilization
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                Room Utilization: {safeGlobalStats.resourceUtilization.rooms}%
              </Typography>
              <Typography variant="body1" gutterBottom>
                Lab Utilization: {safeGlobalStats.resourceUtilization.labs}%
              </Typography>
              <Typography variant="body1" gutterBottom>
                Special Equipment Usage: {safeGlobalStats.resourceUtilization.equipment}%
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Critical Issues */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Critical Issues
            </Typography>
            <List>
              {safeIssues
                .filter((issue: Issue) => issue.severity === 'error')
                .map((issue: Issue) => (
                  <ListItem key={issue.id}>
                    <ListItemIcon>
                      <Warning color="error" />
                    </ListItemIcon>
                    <ListItemText primary={issue.message} secondary={`Department: ${issue.department} | Status: ${issue.status}`} />
                    <Button variant="outlined" size="small" href={`/coordinator/issues/${issue.id}`}>
                      Resolve
                    </Button>
                  </ListItem>
                ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </DashboardLayout>
  );
};
