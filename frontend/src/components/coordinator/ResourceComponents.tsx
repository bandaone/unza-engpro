import React, { useState } from 'react';
import type { Room } from '../../types/index';
import { useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/apiService';
import {
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { RoomDialog } from '../dialogs/RoomDialog';

export const ResourceManagement: React.FC<{ rooms: Room[] }> = ({ rooms }) => {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async (roomData: Partial<Room>) => {
    try {
      if (selectedRoom?.id) {
        await apiService.rooms.update(selectedRoom.id, roomData);
      } else {
        await apiService.rooms.create(roomData as Room);
      }
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    } catch (error) {
      console.error('Failed to save room:', error);
    }
  };

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">Room Management</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => {
            setSelectedRoom(null);
            setDialogOpen(true);
          }}
        >
          Add Room
        </Button>
        <List>
          {rooms.map((room) => (
            <ListItem key={room.id}>
              <ListItemText
                primary={room.name}
                secondary={
                  <>
                    Capacity: {room.capacity} | Type: {room.type}
                    <br />
                    Equipment: {room.equipment.map(eq => (
                      <Chip key={eq} label={eq} size="small" style={{ marginRight: 4 }} />
                    ))}
                  </>
                }
              />
              <ListItemSecondaryAction>
                <IconButton onClick={() => {
                  setSelectedRoom(room);
                  setDialogOpen(true);
                }}>
                  <EditIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
        {dialogOpen && (
            <RoomDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                room={selectedRoom}
                onSave={handleSave}
            />
        )}
      </AccordionDetails>
    </Accordion>
  );
};
