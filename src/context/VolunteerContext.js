import React, { createContext, useContext, useState, useEffect } from 'react';

const VolunteerContext = createContext();

export const useVolunteer = () => {
    const context = useContext(VolunteerContext);
    if (!context) {
        throw new Error('useVolunteer must be used within a VolunteerProvider');
    }
    return context;
};

export const VolunteerProvider = ({ children }) => {
    const [activeTask, setActiveTask] = useState(null);
    const [isTracking, setIsTracking] = useState(false);
    const [sessionStats, setSessionStats] = useState({
        distance: 0,
        activeHours: 0,
        tasksCompleted: 0,
    });
    const [volunteerLocation, setVolunteerLocation] = useState({
        latitude: 12.9716,
        longitude: 77.5946,
    });

    // Simulate location movement/tracking when active
    useEffect(() => {
        let interval;
        if (isTracking && activeTask) {
            interval = setInterval(() => {
                setSessionStats(prev => ({
                    ...prev,
                    distance: prev.distance + 0.01, // Simulate 10 meters per tick
                }));
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [isTracking, activeTask]);

    const startTask = (task) => {
        setActiveTask(task);
        setIsTracking(true);
    };

    const completeTask = () => {
        setSessionStats(prev => ({
            ...prev,
            tasksCompleted: prev.tasksCompleted + 1,
        }));
        setActiveTask(null);
        setIsTracking(false);
    };

    return (
        <VolunteerContext.Provider
            value={{
                activeTask,
                isTracking,
                sessionStats,
                volunteerLocation,
                startTask,
                completeTask,
                setActiveTask,
                setIsTracking,
            }}
        >
            {children}
        </VolunteerContext.Provider>
    );
};
