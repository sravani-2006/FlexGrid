import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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

    /**
     * CLEAN REUSABLE FUNCTIONS (Real-time Backend Sync)
     */

    // Feature 1: Accept Task
    const acceptTask = async (issueId) => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            const userId = userData.user.id;

            const { data, error } = await supabase
                .from('issues')
                .update({
                    status: 'in_progress',
                    assigned_to: userId,
                    accepted_at: new Date().toISOString()
                })
                .eq('id', issueId)
                .eq('status', 'open')
                .is('assigned_to', null)
                .select('id, status, assigned_to');

            if (error) throw error;
            if (!data || data.length === 0) {
                throw new Error('Task not updated. It may already be accepted or blocked by RLS policy.');
            }
            return { success: true };
        } catch (e) {
            console.error('[VolunteerContext] acceptTask error:', e);
            throw e;
        }
    };

    // Feature 2/3: Resolve Task + Reward
    const resolveTask = async (issueId, photoUrl, rewardAmount) => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            const userId = userData.user.id;

            // 1. Update issue (schema-tolerant for photo columns)
            const completedAt = new Date().toISOString();
            const statusCandidates = ['completed', 'resolved'];

            let issueUpdated = false;
            let lastIssueError = null;

            for (const statusValue of statusCandidates) {
                const issuePayloads = [
                    { status: statusValue, proof_photo_url: photoUrl, after_photo_url: photoUrl, completed_at: completedAt },
                    { status: statusValue, proof_photo_url: photoUrl, completed_at: completedAt },
                    { status: statusValue, after_photo_url: photoUrl, completed_at: completedAt },
                    { status: statusValue, completed_at: completedAt },
                ];

                for (const payload of issuePayloads) {
                    const { error } = await supabase.from('issues').update(payload).eq('id', issueId);
                    if (!error) {
                        issueUpdated = true;
                        break;
                    }

                    lastIssueError = error;
                    const msg = (error.message || '').toLowerCase();
                    if (!msg.includes('could not find the') && !msg.includes('column') && !msg.includes('check constraint')) {
                        break;
                    }
                }

                if (issueUpdated) break;
            }

            if (!issueUpdated && lastIssueError) throw lastIssueError;

            // 2. Insert Reward (schema-tolerant: rewards table columns vary across setups)
            const rewardPayloads = [
                { user_id: userId, issue_id: issueId, reward: rewardAmount, status: 'credited' },
                { user_id: userId, issue_id: issueId, amount: rewardAmount, status: 'credited' },
                { user_id: userId, issue_id: issueId, points: rewardAmount, status: 'credited' },
                { user_id: userId, issue_id: issueId, xp: rewardAmount, status: 'credited' },
                { user_id: userId, issue_id: issueId, reward: rewardAmount },
                { user_id: userId, issue_id: issueId, amount: rewardAmount },
                { user_id: userId, issue_id: issueId, points: rewardAmount },
                { user_id: userId, issue_id: issueId, xp: rewardAmount },
                { user_id: userId, issue_id: issueId },
            ];

            let rewardInserted = false;
            let lastRewardError = null;
            for (const payload of rewardPayloads) {
                const { error } = await supabase.from('rewards').insert(payload);
                if (!error) {
                    rewardInserted = true;
                    break;
                }

                lastRewardError = error;
                const msg = (error.message || '').toLowerCase();
                // Keep trying only for missing-column style errors.
                if (!msg.includes('could not find the') && !msg.includes('column')) {
                    break;
                }
            }

            if (!rewardInserted && lastRewardError) {
                console.warn('[VolunteerContext] Reward record failed:', lastRewardError);
            }
            
            completeTask();
            return { success: true };
        } catch (e) {
            console.error('[VolunteerContext] resolveTask error:', e);
            throw e;
        }
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
                acceptTask,
                resolveTask,
                setActiveTask,
                setIsTracking,
            }}
        >
            {children}
        </VolunteerContext.Provider>
    );
};
