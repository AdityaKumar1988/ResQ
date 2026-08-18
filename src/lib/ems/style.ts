import type { Priority, AmbulanceStatus } from "@/lib/ems/types";

export function priorityClasses(p: Priority) {
  switch (p) {
    case "P1":
      return {
        bg: "bg-p1/15",
        text: "text-p1",
        border: "border-p1/40",
        solid: "bg-p1 text-p1-foreground",
        ring: "ring-p1/40",
      };
    case "P2":
      return {
        bg: "bg-p2/15",
        text: "text-p2",
        border: "border-p2/40",
        solid: "bg-p2 text-p2-foreground",
        ring: "ring-p2/40",
      };
    case "P3":
      return {
        bg: "bg-p3/15",
        text: "text-p3",
        border: "border-p3/40",
        solid: "bg-p3 text-p3-foreground",
        ring: "ring-p3/40",
      };
    case "P4":
      return {
        bg: "bg-p4/15",
        text: "text-p4",
        border: "border-p4/40",
        solid: "bg-p4 text-p4-foreground",
        ring: "ring-p4/40",
      };
  }
}

export function statusClasses(s: AmbulanceStatus) {
  switch (s) {
    case "available":
      return {
        bg: "bg-status-available/15",
        text: "text-status-available",
        dot: "bg-status-available",
      };
    case "en_route":
      return { bg: "bg-status-enroute/15", text: "text-status-enroute", dot: "bg-status-enroute" };
    case "busy":
      return { bg: "bg-status-busy/15", text: "text-status-busy", dot: "bg-status-busy" };
    case "at_hospital":
      return {
        bg: "bg-status-hospital/15",
        text: "text-status-hospital",
        dot: "bg-status-hospital",
      };
    case "offline":
      return { bg: "bg-status-offline/15", text: "text-status-offline", dot: "bg-status-offline" };
    case "maintenance":
      return {
        bg: "bg-status-maintenance/15",
        text: "text-status-maintenance",
        dot: "bg-status-maintenance",
      };
  }
}
