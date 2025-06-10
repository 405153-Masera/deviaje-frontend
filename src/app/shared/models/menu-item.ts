export interface MenuItem {
    icon: string;
    label: string;
    route: string;
    isSelected?: boolean;
    isExpanded?: boolean;
    subItems?: MenuItem[];
}