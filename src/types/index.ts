// Main data interfaces for the logistics dashboard

export interface VoyageEvent {
  id: string;
  vessel: string;
  voyageNumber: string;
  parentEvent: string;
  event?: string;
  location: string;
  mappedLocation: string;
  department?: string;
  finalHours: number;
  activityCategory: 'Productive' | 'Non-Productive' | 'Uncategorized';
  portType: 'rig' | 'base';
  eventDate: string;
  lcNumber?: string;
  company?: string;
}

export interface VesselManifest {
  id: string;
  voyageId: string;
  manifestNumber: string;
  transporter: string;
  offshoreLocation: string;
  deckTons: number;
  rtTons: number;
  lifts: number;
  manifestDate: string;
  costCode?: string;
  company?: string;
}

export interface MasterFacility {
  locationName: string;
  facilityType: string;
  isDrillingCapable: boolean;
  region?: string;
}

export interface KPIData {
  totalOffshoreTime: number;
  waitingTimePercentage: number;
  cargoOpsHours: number;
  liftsPerCargoHour: number;
  momChanges: {
    waitingTime: number;
    cargoOps: number;
    liftsPerHour: number;
  };
}
