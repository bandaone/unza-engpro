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
  Box,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { Room } from '../../types';

interface RoomDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Room>) => Promise<void>;
  room: Room | null;
}

export const RoomDialog: React.FC<RoomDialogProps> = ({ open, onClose, onSave, room }) => {
  const { control, handleSubmit, formState: { errors } } = useForm<Room>({
    defaultValues: room || {
      name: '',
      type: 'classroom',
      capacity: 0,
      equipment: [],
    },
  });

  const onSubmit = async (data: Room) => {
    try {
      const equipmentArray = typeof data.equipment === 'string'
        ? (data.equipment as string).split(',').map(item => item.trim()).filter(Boolean)
        : data.equipment;

      await onSave({ ...data, equipment: equipmentArray });
      onClose();
    } catch (error) {
      console.error('Failed to save room:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{room ? 'Edit Room' : 'Add Room'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 2, paddingTop: 1 }}>
            <Controller
              name="name"
              control={control}
              rules={{ required: 'Room name is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  autoFocus
                  label="Room Name"
                  fullWidth
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              )}
            />
            <Controller
              name="type"
              control={control}
              rules={{ required: 'Room type is required' }}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.type}>
                  <InputLabel>Type</InputLabel>
                  <Select {...field} label="Type">
                    <MenuItem value="classroom">Classroom</MenuItem>
                    <MenuItem value="lab">Laboratory</MenuItem>
                    <MenuItem value="special">Special</MenuItem>
                  </Select>
                </FormControl>
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
            <Controller
              name="equipment"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Equipment (comma-separated)"
                  fullWidth
                  value={Array.isArray(field.value) ? field.value.join(', ') : field.value}
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
