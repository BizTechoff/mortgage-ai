

export interface AppointmentDetails {
    date: Date;
    time: string;
    location?: string;
    operatorName?: string;
};


// Create interfaces for the server response
export interface AppointmentWithDetails {
  startDate: Date;
  title: string;
  description: string;
  customer: {
    name: string;
    phone: string;
  };
  request: {
    requestType: string;
  };
}
