import { Outlet } from "react-router-dom";
import { ParticipationProvider } from "../../context/ParticipationContext";

/**
 * Section boundary. The dataset is loaded once here so every surface below
 * reads the same records — a report verified on Polling Units is immediately
 * reflected in the National coverage figure.
 */
export default function ParticipationLayout() {
  return (
    <ParticipationProvider>
      <Outlet />
    </ParticipationProvider>
  );
}
