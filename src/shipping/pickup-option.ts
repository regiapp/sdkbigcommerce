interface Item {
    variant_id: number;
    quantity: number;
}

interface Radius {
    value: number;
    unit: number;
}

interface Coordinates {
    latitude: number;
    longitude: number;
}

interface SearchArea {
    radius: Radius;
    coordinates: Coordinates;
}

interface PickupMethod {
    id: number;
    location_id: number;
    display_name: string;
    collection_instructions: string;
    collection_time_description: string;
}

interface Options {
    pickup_method: PickupMethod;
    item_quantities: Item;
}

interface PickupOptionsResult {
    options: Options[];
}

export interface PickupOptionRequestPayload {
    search_area: SearchArea;
    items: Item[];
}

export interface ConsignmentPickupOption {
    pickupMethodId: number;
}

export interface PickupOptionResponseBody {
    results: PickupOptionsResult[];
}
