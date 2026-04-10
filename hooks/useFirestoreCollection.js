import { useState, useEffect, useCallback } from "react";
import { subscribeToCollection, getCollection } from "../services/firebaseService";

/**
 * Custom hook for Firestore collection data with real-time updates
 * @param {string} collectionName - Firestore collection name
 * @param {object} options - Query options { realtime, orderBy, orderDirection, where, limit }
 * @returns {object} Collection data and methods
 */
export const useFirestoreCollection = (collectionName, options = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    realtime = true,
    orderBy = null,
    orderDirection = "desc",
    where = null,
    limit = null,
    enabled = true,
  } = options;

  // Fetch data (one-time)
  const fetchData = useCallback(async () => {
    if (!enabled || !collectionName) return;

    setLoading(true);
    setError(null);

    try {
      const result = await getCollection(collectionName, {
        orderBy,
        orderDirection,
        limit,
      });
      setData(result);
    } catch (err) {
      console.error(`Error fetching ${collectionName}:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [collectionName, orderBy, orderDirection, limit, enabled]);

  // Subscribe to real-time updates or fetch once
  useEffect(() => {
    if (!enabled || !collectionName) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (realtime) {
      // Real-time subscription
      const unsubscribe = subscribeToCollection(
        collectionName,
        (docs) => {
          setData(docs);
          setLoading(false);
        },
        { orderBy, orderDirection, where, limit }
      );

      return () => unsubscribe();
    } else {
      // One-time fetch
      fetchData();
    }
  }, [collectionName, realtime, orderBy, orderDirection, where, limit, enabled, fetchData]);

  // Manual refresh
  const refresh = useCallback(() => {
    if (realtime) {
      // For realtime, data updates automatically
      return;
    }
    fetchData();
  }, [realtime, fetchData]);

  // Find item by ID
  const findById = useCallback(
    (id) => {
      return data.find((item) => item.id === id);
    },
    [data]
  );

  // Filter data locally
  const filter = useCallback(
    (filterFn) => {
      return data.filter(filterFn);
    },
    [data]
  );

  return {
    data,
    loading,
    error,
    refresh,
    findById,
    filter,
    isEmpty: data.length === 0,
    count: data.length,
  };
};

export default useFirestoreCollection;
