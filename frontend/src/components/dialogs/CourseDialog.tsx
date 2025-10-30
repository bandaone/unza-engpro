import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Chip,
  Box,
  FormHelperText,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { Course, Lecturer, Group } from '../../types';

interface CourseDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Course>) => Promise<void>;
  course: Course | null;
  lecturers: Lecturer[];
  groups: Group[];
  department: string;
}

export const CourseDialog: React.FC<CourseDialogProps> = ({
  open,
  onClose,
  onSave,
  course,
  lecturers,
  groups,
  department,
}) => {
  const { control, handleSubmit, watch, formState: { errors } } = useForm<Course>({
    defaultValues: course || {
      code: '',
      name: '',
      department: department,
      weekly_hours: 0,
      has_lab: false,
      lab_weekly_hours: 0,
      lecturers: [],
      groups: [],
      requirements: {
        equipment: [],
        room_type: 'classroom',
        capacity: 0,
      },
    },
  });

  const has_lab = watch('has_lab');

  const onSubmit = async (data: Course) => {
    try {
      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Failed to save course:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{course ? 'Edit Course' : 'Add Course'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <Controller
              name="code"
              control={control}
              rules={{ required: 'Course code is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Course Code"
                  error={!!errors.code}
                  helperText={errors.code?.message}
                  fullWidth
                />
              )}
            />
            <Controller
              name="name"
              control={control}
              rules={{ required: 'Course name is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Course Name"
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  fullWidth
                />
              )}
            />
            <Controller
              name="weekly_hours"
              control={control}
              rules={{ required: 'Weekly hours required', min: 1 }}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="Weekly Hours"
                  error={!!errors.weekly_hours}
                  helperText={errors.weekly_hours?.message}
                  fullWidth
                />
              )}
            />
            <Controller
              name="has_lab"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={field.value} />}
                  label="Has Laboratory Component"
                />
              )}
            />
            {has_lab && (
              <Controller
                name="lab_weekly_hours"
                control={control}
                rules={{ required: 'Lab hours required when lab is enabled', min: 1 }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Lab Weekly Hours"
                    error={!!errors.lab_weekly_hours}
                    helperText={errors.lab_weekly_hours?.message}
                    fullWidth
                  />
                )}
              />
            )}
            <Controller
              name="lecturers"
              control={control}
              rules={{ required: 'At least one lecturer required' }}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.lecturers}>
                  <InputLabel>Lecturers</InputLabel>
                  <Select
                    {...field}
                    multiple
                    renderValue={(selected: number[]) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip
                            key={value}
                            label={lecturers.find(l => l.id === value)?.name}
                          />
                        ))}
                      </Box>
                    )}
                  >
                    {lecturers.map((lecturer) => (
                      <MenuItem key={lecturer.id} value={lecturer.id}>
                        {lecturer.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.lecturers && (
                    <FormHelperText>{errors.lecturers.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
            <Controller
              name="groups"
              control={control}
              rules={{ required: 'At least one group required' }}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.groups}>
                  <InputLabel>Groups</InputLabel>
                  <Select
                    {...field}
                    multiple
                    renderValue={(selected: number[]) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip
                            key={value}
                            label={groups.find(g => g.id === value)?.name}
                          />
                        ))}
                      </Box>
                    )}
                  >
                    {groups.map((group) => (
                      <MenuItem key={group.id} value={group.id}>
                        {group.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.groups && (
                    <FormHelperText>{errors.groups.message}</FormHelperText>
                  )}
                </FormControl>
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
