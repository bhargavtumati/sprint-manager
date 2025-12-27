export const WorkType = {
    BUG: "Bug",
    TASK: "Task",
    STORY: "Story",
    REVIEW: "Review",
} as const;

export const Workflow = {
    BACKLOG: "Backlog",
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    ON_HOLD: "On Hold",
    DONE: "Done",
} as const;

export const Priority = {
    BLOCKER: "Blocker",
    CRITICAL: "Critical",
    MAJOR: "Major",
    MEDIUM: "Medium",
    MINOR: "Minor",
    TRIVIAL: "Trivial",
} as const;

export type WorkType = typeof WorkType[keyof typeof WorkType];
export type Workflow = typeof Workflow[keyof typeof Workflow];
export type Priority = typeof Priority[keyof typeof Priority];

export type Task = {
    id: number;
    title: string;
    work_type: WorkType;
    work_flow: Workflow;
    priority: Priority;
    sprint_id?: number;
    user_id?: number | null;
    project_id?: number;
    description?: string;
    code?: string;
};
