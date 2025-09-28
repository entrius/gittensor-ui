import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import React from "react";
import { useNavigate } from "react-router-dom";
import { MegaphoneIcon, CubeIcon } from "@heroicons/react/24/outline";

// I'm using heroicons as my icon library instead of google icon
// https://heroicons.com/outline

type ListMenuButtonProps = {
  name: string;
  icon: React.ReactElement;
  onClick: () => void;
};

const ListMenuButton: React.FC<ListMenuButtonProps> = ({
  name,
  icon,
  onClick,
}) => {
  return (
    <ListItem disablePadding>
      <ListItemButton disableRipple onClick={onClick}>
        <ListItemIcon sx={{ color: "primary.main" }}>{icon}</ListItemIcon>
        <ListItemText primary={name} />
      </ListItemButton>
    </ListItem>
  );
};

export const Menu: React.FC = () => {
  const navigate = useNavigate();

  return (
    <List>
      <ListMenuButton
        name="about"
        icon={<MegaphoneIcon style={{ height: 20, width: 20 }} />}
        onClick={() => navigate("/about")}
      />
      <ListMenuButton
        name="dashboard"
        icon={<CubeIcon style={{ height: 20, width: 20 }} />}
        onClick={() => navigate("/")}
      />
    </List>
  );
};

export default Menu;
