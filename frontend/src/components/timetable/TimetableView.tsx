import React from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';

// Generate time slots based on backend configuration
const generateTimeSlots = () => {
  const slots = [];
  let currentTime = new Date();
  currentTime.setHours(8, 0, 0); // day_start from config
  const endTime = new Date();
  endTime.setHours(17, 0, 0);   // day_end from config
  
  while (currentTime < endTime) {
    const start = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    currentTime.setMinutes(currentTime.getMinutes() + 60); // slot_minutes from config
    const end = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    slots.push(`${start} - ${end}`);
  }
  return slots;
};

const timeSlots = generateTimeSlots();
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']; // week_days from config

interface TimetableEvent {
  id: number;
  course: {
    id: number;
    code: string;
    name: string;
  };
  room: {
    id: number;
    name: string;
  };
  group: {
    id: number;
    name: string;
  };
  lecturer: {
    id: number;
    name: string;
  };
  day: string;
  start: string;
  end: string;
}

const CourseCell: React.FC<{ event: TimetableEvent }> = ({ event }) => (
  <Box sx={{ p: 1 }}>
    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
      {event.course.code}
    </Typography>
    <Typography variant="body2" color="textSecondary">
      {event.course.name}
    </Typography>
    <Typography variant="body2" color="textSecondary">
      Room: {event.room.name}
    </Typography>
    <Box sx={{ mt: 1 }}>
      <Chip
        label={event.group.name}
        size="small"
        sx={{ mr: 0.5, mb: 0.5 }}
      />
    </Box>
    <Typography variant="caption" color="textSecondary" display="block">
      {event.lecturer.name}
    </Typography>
  </Box>
);

interface TimetableViewProps {
  department?: string;
  events?: TimetableEvent[];
}

export const TimetableView: React.FC<TimetableViewProps> = ({ department, events: initialEvents }) => {
  const { data: fetchedEvents, isLoading } = useQuery({
    queryKey: ['timetable', department],
    queryFn: async () => {
      const response = await apiService.timetable.getDepartment(department || '');
      return response.data.data as TimetableEvent[];
    },
    enabled: !!department && !initialEvents,
  });

  const events = initialEvents || fetchedEvents;

  if (isLoading) {
    return <Typography>Loading timetable...</Typography>;
  }

  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Time</TableCell>
            {days.map((day) => (
              <TableCell key={day} align="center" sx={{ minWidth: 200 }}>
                {day}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {timeSlots.map((timeSlot) => (
            <TableRow key={timeSlot}>
              <TableCell component="th" scope="row">
                {timeSlot}
              </TableCell>
              {days.map((day) => {
                const event = events?.find(
                  (e) => e.day === day && 
                        e.start === timeSlot.split(' - ')[0]
                );
                return (
                  <TableCell key={`${day}-${timeSlot}`} sx={{ p: 1 }}>
                    {event ? <CourseCell event={event} /> : null}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
