import React from 'react';
import { CourseManagement } from '../../components/department/ManagementComponents';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/apiService';
import { useAuthStore } from '../../stores/authStore';

export const CoursesPage: React.FC = () => {
  const { user } = useAuthStore();
  const { data: courses } = useQuery({
    queryKey: ['courses', user?.department],
    queryFn: () => apiService.courses.getAll(),
    initialData: [],
  });

  return (
    <DashboardLayout title="Courses">
      <CourseManagement 
        courses={courses}
        department={user?.department || ''}
      />
    </DashboardLayout>
  );
};
