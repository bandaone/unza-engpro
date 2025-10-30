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
import { Lecturer } from '../../types';

interface LecturerDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Lecturer>) => Promise<void>;
  lecturer: Lecturer | null;
  department: string;
}

export const LecturerDialog: React.FC<LecturerDialogProps> = ({ open, onClose, onSave, lecturer, department }) => {
  const { control, handleSubmit, formState: { errors } } = useForm<Lecturer>({
    defaultValues: lecturer || {
      name: '',
      email: '',
      department: department,
      courses: [],
      preferences: {},
    },
  });

  const onSubmit = async (data: Lecturer) => {
    try {
      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Failed to save lecturer:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{lecturer ? 'Edit Lecturer' : 'Add Lecturer'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 2, paddingTop: 1 }}>
            <Controller
              name="name"
              control={control}
              rules={{ required: 'Lecturer name is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  autoFocus
                  label="Full Name"
                  fullWidth
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              )}
            />
            <Controller
              name="email"
              control={control}
              rules={{ required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email address' } }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Email Address"
                  type="email"
                  fullWidth
                  error={!!errors.email}
                  helperText={errors.email?.message}
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
