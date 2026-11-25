
const Pro = require("pro.db");

const CONFIG_KEY = guildId => `ticket_config_${guildId}`;
const TICKET_KEY = channelId => `ticket_data_${channelId}`;
const MEMBER_KEY = (guildId, userId) => `ticket_member_${guildId}_${userId}`;
const COUNTER_KEY = guildId => `ticket_counter_${guildId}`;
const POINTS_KEY = (guildId, userId) => `ticket_points_${guildId}_${userId}`;
const HISTORY_KEY = (guildId, userId) => `ticket_history_${guildId}_${userId}`;

function getConfig(guildId) {
    return Pro.get(CONFIG_KEY(guildId));
}

function setConfig(guildId, data) {
    return Pro.set(CONFIG_KEY(guildId), data);
}

function getTicket(channelId) {
    return Pro.get(TICKET_KEY(channelId));
}

function setTicket(channelId, data) {
    return Pro.set(TICKET_KEY(channelId), data);
}

function deleteTicket(channelId) {
    const data = getTicket(channelId);

    if (data) {
        Pro.delete(MEMBER_KEY(data.guildId, data.userId));
    }

    Pro.delete(TICKET_KEY(channelId));
}

function nextNumber(guildId) {
    const number = Number(Pro.get(COUNTER_KEY(guildId)) || 0) + 1;
    Pro.set(COUNTER_KEY(guildId), number);
    return number;
}

function getPoints(guildId, userId) {
    return Number(Pro.get(POINTS_KEY(guildId, userId)) || 0);
}

function addPoint(guildId, userId) {
    const points = getPoints(guildId, userId) + 1;
    Pro.set(POINTS_KEY(guildId, userId), points);
    return points;
}

// سجل التكتات السابقة
function getHistory(guildId, userId) {
    return Pro.get(HISTORY_KEY(guildId, userId)) || [];
}

function saveHistory(guildId, userId, history) {
    return Pro.set(HISTORY_KEY(guildId, userId), history);
}

function addHistory(guildId, userId, ticket) {
    const history = getHistory(guildId, userId);

    history.unshift({
        number: ticket.number,
        channelId: ticket.channelId,
        categoryId: ticket.categoryId,
        categoryName: ticket.categoryName,
        status: ticket.status,
        createdAt: ticket.createdAt,
        closedAt: ticket.closedAt || null
    });

    return saveHistory(guildId, userId, history);
}

function updateHistory(guildId, userId, channelId, updates) {
    const history = getHistory(guildId, userId);

    const index = history.findIndex(
        item => item.channelId === channelId
    );

    if (index === -1) return false;

    history[index] = {
        ...history[index],
        ...updates
    };

    saveHistory(guildId, userId, history);
    return true;
}


// ───────── الطلبات المعلّقة (قبل ما يتفتح روم التكت) ─────────
const PENDING_KEY = (guildId, number) => `ticket_pending_${guildId}_${number}`;

function getPending(guildId, number) {
    return Pro.get(PENDING_KEY(guildId, number));
}

function setPending(guildId, number, data) {
    return Pro.set(PENDING_KEY(guildId, number), data);
}

function deletePending(guildId, number) {
    return Pro.delete(PENDING_KEY(guildId, number));
}

// تحديث سجل التكت بالرقم (مفيد قبل ما يكون له روم)
function updateHistoryByNumber(guildId, userId, number, updates) {
    const history = getHistory(guildId, userId);
    const index = history.findIndex(item => Number(item.number) === Number(number));

    if (index === -1) return false;

    history[index] = { ...history[index], ...updates };
    saveHistory(guildId, userId, history);
    return true;
}

function renderText(text, values = {}) {
    let result = String(text || "");

    for (const [key, value] of Object.entries(values)) {
        result = result.replace(
            new RegExp(`\\{${key}\\}`, "g"),
            String(value ?? "")
        );
    }

    return result;
}

function isStaff(member, config) {
    if (!member || !config) return false;

    if (
        member.permissions.has("ADMINISTRATOR") ||
        member.permissions.has("MANAGE_GUILD")
    ) {
        return true;
    }

    return (config.reviewerRoleIds || []).some(roleId =>
        member.roles.cache.has(roleId)
    );
}

function canManageTicket(member, ticket, config) {
    if (isStaff(member, config)) return true;
    if (ticket.claimedBy === member.id) return true;
    return ticket.userId === member.id;
}

module.exports = {
    CONFIG_KEY,
    TICKET_KEY,
    MEMBER_KEY,
    COUNTER_KEY,
    POINTS_KEY,
    HISTORY_KEY,

    getConfig,
    setConfig,
    getTicket,
    setTicket,
    deleteTicket,
    nextNumber,
    getPoints,
    addPoint,

    getPending,
    setPending,
    deletePending,
    updateHistoryByNumber,

    getHistory,
    saveHistory,
    addHistory,
    updateHistory,

    renderText,
    isStaff,
    canManageTicket
};
