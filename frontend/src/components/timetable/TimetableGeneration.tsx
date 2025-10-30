import React from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Warning as WarningIcon,
  Check as CheckIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/apiService';
import { Issue, TimetableStatus } from '../../types';

const defaultTimetableStatus: TimetableStatus = {
  status: 'idle',
};

export const TimetableGeneration: React.FC = () => {
  const [confirmDialog, setConfirmDialog] = React.useState(false);
  const queryClient = useQueryClient();

  // Get validation status
  const { data: validationIssues = [] } = useQuery({
    queryKey: ['validationIssues'],
    queryFn: () => apiService.timetable.getValidation(),
  });

  // Get generation status
  const { data: generationStatus = defaultTimetableStatus } = useQuery({
    queryKey: ['timetableStatus'],
    queryFn: () => apiService.timetable.getStatus(),
    refetchInterval: (data?: any) => (data?.status === 'running' ? 5000 : false),
  });

  // Generation mutation
  const generateMutation = useMutation({
    mutationFn: () => apiService.timetable.generate(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['timetableStatus']
      });
    }
  });

  const hasErrors = validationIssues.some(
    (issue: Issue) => issue.severity === 'error'
  );

  const handleGenerate = () => {
    if (hasErrors) {
      setConfirmDialog(true);
    } else {
      generateMutation.mutate();
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Timetable Generation</Typography>
          <Button
            variant="contained"
            startIcon={<StartIcon />}
            onClick={handleGenerate}
            disabled={generationStatus.status === 'running'}
          >
            Generate Timetable
          </Button>
        </Box>

        {/* Generation Status */}
        {generationStatus.status === 'running' && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Generation in progress...
            </Typography>
            <LinearProgress variant="indeterminate" />
            {generationStatus.progress && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {generationStatus.progress}%
              </Typography>
            )}
          </Box>
        )}

        {/* Results or Errors */}
        {generationStatus.status === 'completed' && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Timetable generated successfully
          </Alert>
        )}

        {generationStatus.status === 'failed' && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {generationStatus.error || 'Timetable generation failed'}
          </Alert>
        )}

        {/* Validation Issues */}
        {validationIssues.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Validation Issues
            </Typography>
            <List>
              {validationIssues.map((issue: Issue, index: number) => (
                <ListItem key={issue.id || index}>
                  <ListItemIcon>
                    {issue.severity === 'error' ? (
                      <WarningIcon color="error" />
                    ) : (
                      <WarningIcon color="warning" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={issue.message}
                    secondary={`Severity: ${issue.severity}`}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Paper>

      {/* Generation Statistics */}
      {generationStatus.stats && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Generation Statistics
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <ScheduleIcon />
              </ListItemIcon>
              <ListItemText
                primary="Room Utilization"
                secondary={`${generationStatus.stats.roomUtilization}%`}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckIcon />
              </ListItemIcon>
              <ListItemText
                primary="Constraints Satisfied"
                secondary={`${generationStatus.stats.constraintsSatisfied}%`}
              />
            </ListItem>
          </List>
        </Paper>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
        <DialogTitle>Warning: Validation Issues</DialogTitle>
        <DialogContent>
          <Typography>
            There are validation errors that might affect the timetable generation.
            Are you sure you want to proceed?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setConfirmDialog(false);
              generateMutation.mutate();
            }}
            color="error"
          >
            Generate Anyway
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
