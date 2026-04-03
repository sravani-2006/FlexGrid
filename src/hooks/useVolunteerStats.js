import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const useVolunteerStats = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalEarned: 0,
        completedTasks: 0,
        xpPoints: 0,
        rank: '--',
    });
    const [rewardHistory, setRewardHistory] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);

    const getRewardValue = (row) => {
        const value = row?.reward ?? row?.amount ?? row?.points ?? row?.xp ?? row?.xp_points ?? 0;
        return Number(value) || 0;
    };

    const getRewardStatus = (row) => {
        if (typeof row?.status === 'string') return row.status.toLowerCase();
        if (row?.claimed === true || row?.is_claimed === true) return 'credited';
        return 'credited';
    };

    const fetchStats = async () => {
        if (!user) return;
        setLoading(true);

        try {
            // 1. Fetch User Rewards History
            const { data: userRewards, error: historyError } = await supabase
                .from('rewards')
                .select(`
                    *,
                    issue:issues(title, location_name, severity)
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (historyError) throw historyError;
            const normalizedHistory = (userRewards || []).map((row) => ({
                ...row,
                reward_value: getRewardValue(row),
                reward_status: getRewardStatus(row),
            }));
            setRewardHistory(normalizedHistory);

            // 2. Fetch Global Leaderboard (for aggregation)
            // Simplified: Fetch all rewards and aggregate client-side for the MVP
            const { data: allRewards, error: lbError } = await supabase
                .from('rewards')
                .select('*');
            
            if (lbError) throw lbError;

            // Aggregate global data
            const userAggregates = (allRewards || []).reduce((acc, curr) => {
                if (!acc[curr.user_id]) {
                    acc[curr.user_id] = { id: curr.user_id, xp: 0, tasks: 0 };
                }
                acc[curr.user_id].xp += getRewardValue(curr);
                acc[curr.user_id].tasks += 1;
                return acc;
            }, {});

            // Convert to array and sort
            const sortedUsers = Object.values(userAggregates).sort((a, b) => b.xp - a.xp);
            
            // Find My Stats
            const myGlobalStats = userAggregates[user.id] || { xp: 0, tasks: 0 };
            const myRank = sortedUsers.findIndex(u => u.id === user.id) + 1;

            setStats({
                totalEarned: normalizedHistory.reduce((sum, r) => sum + r.reward_value, 0),
                completedTasks: normalizedHistory.length,
                xpPoints: myGlobalStats.xp,
                rank: myRank > 0 ? `#${myRank}` : 'Unranked',
            });

            // 3. Profiles for Leaderboard (fetch names for top 10)
            const topUserIds = sortedUsers.slice(0, 10).map(u => u.id);
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, college')
                .in('id', topUserIds);

            const lbData = sortedUsers.slice(0, 5).map((u, index) => {
                const profile = profiles?.find(p => p.id === u.id);
                return {
                    rank: index + 1,
                    name: u.id === user.id ? 'You' : (profile?.full_name || 'Anonymous'),
                    college: profile?.college || 'FixGrid Campus',
                    xp: u.xp,
                    badge: index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '',
                };
            });

            setLeaderboard(lbData);

        } catch (err) {
            console.error('[useVolunteerStats] Error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [user?.id]);

    return { stats, rewardHistory, leaderboard, loading, refresh: fetchStats };
};
