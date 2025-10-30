import React from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { IssuesPanel } from '../../components/department/IssuesPanel';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/apiService';
import { useAuthStore } from '../../stores/authStore';

export const IssuesPage: React.FC = () => {
  const { user } = useAuthStore();
  const { data: issues = [] } = useQuery({
    queryKey: ['departmentIssues', user?.department],
    queryFn: () => apiService.departments.validate(user?.department || ''),
  });

  return (
    <DashboardLayout title="Department Issues">
      <IssuesPanel issues={issues} />
    </DashboardLayout>
  );
};
