import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { Group } from '../../types';

interface GroupDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Group>) => Promise<void>;
  group: Group | null;
  department: string;
}

export const GroupDialog: React.FC<GroupDialogProps> = ({ open, onClose, onSave, group, department }) => {
  const { control, handleSubmit, formState: { errors } } = useForm<Group>({
    defaultValues: group || {
      name: '',
      capacity: 0,
      department: department,
      courses: [],
    },
  });

  const onSubmit = async (data: Group) => {
    try {
      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Failed to save group:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{group ? 'Edit Group' : 'Add Group'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 2, paddingTop: 1 }}>
            <Controller
              name="name"
              control={control}
              rules={{ required: 'Group name is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  autoFocus
                  label="Group Name"
                  fullWidth
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              )}
            />
            <Controller
              name="capacity"
              control={control}
              rules={{ required: 'Capacity is required', min: { value: 1, message: 'Capacity must be at least 1' } }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Capacity"
                  type="number"
                  fullWidth
                  error={!!errors.capacity}
                  helperText={errors.capacity?.message}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">Save</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
