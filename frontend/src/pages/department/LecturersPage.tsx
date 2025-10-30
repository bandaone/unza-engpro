import React from 'react';
import { LecturerManagement } from '../../components/department/ManagementComponents';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/apiService';
import { useAuthStore } from '../../stores/authStore';

export const LecturersPage: React.FC = () => {
  const { user } = useAuthStore();
  const { data: lecturers } = useQuery({
    queryKey: ['lecturers', user?.department],
    queryFn: () => apiService.lecturers.getAll(),
    initialData: [],
  });

  return (
    <DashboardLayout title="Lecturers">
      <LecturerManagement 
        lecturers={lecturers}
        department={user?.department || ''}
      />
    </DashboardLayout>
  );
};
