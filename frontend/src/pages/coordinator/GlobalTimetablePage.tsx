import React from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { TimetableView } from '../../components/timetable/TimetableView';
import { TimetableGeneration } from '../../components/timetable/TimetableGeneration';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/apiService';
import { TimetableEvent } from '../../types';

export const GlobalTimetablePage: React.FC = () => {
  const { data: timetable = { events: [] } } = useQuery<{ events: TimetableEvent[] }>({
    queryKey: ['globalTimetable'],
    queryFn: () => apiService.timetable.getGlobal(),
  });

  return (
    <DashboardLayout title="Global Timetable">
      <TimetableGeneration />
      {timetable.events.length > 0 && <TimetableView events={timetable.events} />}
    </DashboardLayout>
  );
};
