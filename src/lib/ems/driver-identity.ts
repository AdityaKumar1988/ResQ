import { useEffect, useState } from "react";

const KEY = "smart-ems:driver-id";
const DEFAULT_DRIVER_ID = "drv-1";

export function useDriverIdentity(): [string, (id: string) => void] {
  const [driverId, setDriverId] = useState<string>(DEFAULT_DRIVER_ID);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setDriverId(raw);
      else localStorage.setItem(KEY, DEFAULT_DRIVER_ID);
    } catch {
      /* noop */
    }
  }, []);

  function update(id: string) {
    setDriverId(id);
    try {
      localStorage.setItem(KEY, id);
    } catch {
      /* noop */
    }
  }
  return [driverId, update];
}
