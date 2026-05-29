import CircleIconButton from "./CircleIconButton.jsx";
import PlusIcon from "./PlusIcon.jsx";

export default function FloatingAddButton({ onClick, label }) {
  return (
    <div className="pointer-events-none fixed bottom-[calc(68px+env(safe-area-inset-bottom))] left-1/2 z-30 flex w-full max-w-md -translate-x-1/2 justify-end px-4">
      <CircleIconButton
        size="lg"
        variant="primary"
        label={label}
        onClick={onClick}
        className="pointer-events-auto"
      >
        <PlusIcon className="h-6 w-6" />
      </CircleIconButton>
    </div>
  );
}
