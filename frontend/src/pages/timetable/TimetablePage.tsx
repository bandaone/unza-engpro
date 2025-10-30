import React from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { TimetableView } from '../../components/timetable/TimetableView';
import { TimetableGeneration } from '../../components/timetable/TimetableGeneration';
import { useAuthStore } from '../../stores/authStore';

export const TimetablePage: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <DashboardLayout title="Department Timetable">
      <TimetableGeneration />
      <TimetableView department={user?.department} />
    </DashboardLayout>
  );
};
