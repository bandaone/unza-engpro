import React from 'react';
import { GroupManagement } from '../../components/department/ManagementComponents';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/apiService';
import { useAuthStore } from '../../stores/authStore';

export const GroupsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { data: groups } = useQuery({
    queryKey: ['groups', user?.department],
    queryFn: () => apiService.groups.getAll(),
    initialData: [],
  });

  return (
    <DashboardLayout title="Groups">
      <GroupManagement 
        groups={groups}
        department={user?.department || ''}
      />
    </DashboardLayout>
  );
};
