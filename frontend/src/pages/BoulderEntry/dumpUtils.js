import { useEffect, useState } from 'react';
import apiClient from '../../utils/api';

export const formatTon = (kg) => (Number(kg || 0) / 1000).toLocaleString('en-IN', { maximumFractionDigits: 3 });
export const formatKg = (kg) => Number(kg || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

// Local calendar day for a date input (toISOString would shift early-morning IST times to the previous day)
export const toDateInput = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
};

/** Boulder lying on the dump right now (kg), loaded once when a popup opens. */
export function useDumpBalance() {
  const [balance, setBalance] = useState(null);
  useEffect(() => {
    let active = true;
    apiClient.get('/dump-stock/balance')
      .then((response) => { if (active) setBalance(Number(response?.balance || 0)); })
      .catch(() => { if (active) setBalance(0); });
    return () => { active = false; };
  }, []);
  return balance;
}

/** Saved vehicles, for picking the truck or loader by number. */
export function useVehicles() {
  const [vehicles, setVehicles] = useState([]);
  useEffect(() => {
    let active = true;
    apiClient.get('/vehicles')
      .then((response) => { if (active) setVehicles(Array.isArray(response) ? response : []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  return vehicles;
}

export const findVehicle = (vehicles, vehicleNo) => {
  const wanted = String(vehicleNo || '').replace(/\s+/g, '').toUpperCase();
  if (!wanted) return null;
  return vehicles.find((vehicle) => String(vehicle.vehicleNo || '').replace(/\s+/g, '').toUpperCase() === wanted) || null;
};
