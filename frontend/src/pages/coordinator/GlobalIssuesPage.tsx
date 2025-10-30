import React from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { IssuesPanel } from '../../components/department/IssuesPanel';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/apiService';

export const GlobalIssuesPage: React.FC = () => {
  const { data: globalIssues = [] } = useQuery({
    queryKey: ['globalIssues'],
    queryFn: () => apiService.stats.getGlobalIssues(),
  });

  return (
    <DashboardLayout title="Global Issues">
      <IssuesPanel issues={globalIssues} />
    </DashboardLayout>
  );
};
