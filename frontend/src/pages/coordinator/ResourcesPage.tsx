import React from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { ResourceManagement } from '../../components/coordinator/ResourceComponents';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/apiService';

export const ResourcesPage: React.FC = () => {
  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => apiService.rooms.getAll(),
  });

  return (
    <DashboardLayout title="Resources Management">
      <ResourceManagement rooms={rooms} />
    </DashboardLayout>
  );
};
