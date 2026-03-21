export { };

declare global {
    interface Window {
        game: Phaser.Game | null;
        render_game_to_text?: () => string;
        CrazyGames: CrazyGamesGlobal;
    }

    interface CrazyGamesGlobal {
        SDK: CrazySDK;
    }

    interface CrazySDK {
        init(): Promise<void>;
        ad: CrazyAd;
        game: CrazyGame;
        data: CrazyData;
        getEnvironment(): Promise<string>;
    }

    interface CrazyAd {
        requestAd(type: 'midgame' | 'rewarded', callbacks?: CrazyAdCallbacks): void;
    }

    interface CrazyAdCallbacks {
        adStarted?: () => void;
        adFinished?: () => void;
        adError?: (error: any, errorData?: any) => void;
    }

    interface CrazyGame {
        gameplayStart(): void;
        gameplayStop(): void;
        loadingStop(): void;
        happytime(): void;
        addSettingsChangeListener?(listener: (settings: any) => void): void;
    }

    interface CrazyData {
        getItem(key: string): string | null;
        setItem(key: string, value: string): void;
        removeItem(key: string): void;
        clear(): void;
    }
}
