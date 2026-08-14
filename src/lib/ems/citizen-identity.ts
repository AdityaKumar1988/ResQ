import { useEffect, useState } from "react";
import type { Citizen } from "./types";
import { useAuth } from "@/lib/auth-context";

const KEY = "smart-ems:citizen";

function makeDefault(): Citizen {
  return {
    id: `cit-me-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    phone: "",
    address: "",
    location: {
      lat: 0,
      lng: 0,
    },
  };
}

export function useCitizenIdentity(): [Citizen, (patch: Partial<Citizen>) => void] {
  const { user } = useAuth();
  const [citizen, setCitizen] = useState<Citizen>(() => makeDefault());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);

      if (raw) {
        setCitizen(JSON.parse(raw) as Citizen);
      } else {
        localStorage.setItem(KEY, JSON.stringify(makeDefault()));
      }
    } catch {
      // ignore
    }

    if (user && user.role === "citizen") {
      setCitizen((old) => {
        const next = { ...old, name: old.name || user.name, phone: old.phone || (user.phone ?? "") };
        localStorage.setItem(KEY, JSON.stringify(next));
        return next;
      });
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCitizen((old) => {
            const updated = {
              ...old,
              location: {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              },
            };

            localStorage.setItem(KEY, JSON.stringify(updated));

            return updated;
          });
        },
        (err) => {
          console.error(err);
        },
        {
          enableHighAccuracy: true,
        }
      );
    }
  }, []);

  function update(patch: Partial<Citizen>) {
    setCitizen((old) => {
      const next = { ...old, ...patch };

      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}

      return next;
    });
  }

  return [citizen, update];
}