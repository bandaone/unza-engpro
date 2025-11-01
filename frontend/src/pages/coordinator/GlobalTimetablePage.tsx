import React from 'react';
import { Box, Button } from '@mui/material';
import { DashboardLayout } from '../../components/DashboardLayout';
import { TimetableView } from '../../components/timetable/TimetableView';
import { TimetableGeneration } from '../../components/timetable/TimetableGeneration';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/apiService';
import { TimetableEvent } from '../../types';

export const GlobalTimetablePage: React.FC = () => {
  const { data: timetableData = { events: [] } } = useQuery<{ events: TimetableEvent[] }>({
    queryKey: ['globalTimetable'],
    queryFn: () => apiService.timetable.getGlobal(),
  });

  const events = timetableData.events;

  const handlePublish = async () => {
    if (events.length === 0) return;
    
    try {
      await apiService.timetable.publish(events[0].versionId);
      alert('Timetable is being published and sent to lecturers.');
    } catch (error) {
      console.error('Failed to publish timetable:', error);
      alert('Failed to publish timetable. Please try again.');
    }
  };

  return (
    <DashboardLayout title="Global Timetable">
      <TimetableGeneration />
      {events.length > 0 && (
        <>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handlePublish}
            >
              Publish Timetable
            </Button>
          </Box>
          <TimetableView events={events} />
        </>
      )}
    </DashboardLayout>
  );
};
