export interface VideoCollection {
    [key: string]: Video[]
}

interface Video {
    name: string
    path: string
    duration: string
}
