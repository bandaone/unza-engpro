import React from 'react';
import {
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import { Warning } from '@mui/icons-material';

interface Issue {
  type: string;
  message: string;
  severity: 'error' | 'warning';
}

interface IssuesPanelProps {
  issues: Issue[];
}

export const IssuesPanel: React.FC<IssuesPanelProps> = ({ issues }) => {
  return (
    <Paper sx={{ p: 2 }}>
      {issues.length === 0 ? (
        <Typography>No issues found.</Typography>
      ) : (
        <List>
          {issues.map((issue, index) => (
            <ListItem key={index}>
              <ListItemIcon>
                <Warning color={issue.severity === 'error' ? 'error' : 'warning'} />
              </ListItemIcon>
              <ListItemText
                primary={issue.type}
                secondary={issue.message}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
};
