import CircleIconButton from "./CircleIconButton.jsx";
import EditIcon from "./EditIcon.jsx";
import PlusIcon from "./PlusIcon.jsx";

export default function HeaderAddButton({ onClick, label, icon = "plus" }) {
  return (
    <CircleIconButton size="md" onClick={onClick} label={label}>
      {icon === "edit" ? <EditIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
    </CircleIconButton>
  );
}
