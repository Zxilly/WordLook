import {PaletteColor} from "@mui/material";

declare module '@mui/material/styles' {
    interface Palette {
        bg: PaletteColor;
    }

    interface PaletteOptions {
        bg: PaletteColor;
    }
}

declare module '@mui/material/CircularProgress' {
    interface CircularProgressPropsColorOverrides {
        bg: true
    }
}
