// noinspection JSIgnoredPromiseFromCall

import React, {createRef, useCallback, useEffect, useRef, useState} from 'react';
import './App.css';
import {
    Button,
    CircularProgress,
    createTheme,
    CssBaseline,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Snackbar,
    TextField,
    ThemeProvider
} from "@mui/material";
import {BBDC_ENDPOINT, KV_ENDPOINT, TARGET, TOKEN} from "./config";
import {useInterval, useLocalStorage, useToggle} from "react-use";
import {getDate, isReview} from "./utils";
import ParticlesBg from 'particles-bg';

enum State {
    info = "info",
    success = "success",
    primary = "primary",
}

const {palette} = createTheme();
const theme = createTheme(
    {
        palette: {
            bg: palette.augmentColor({
                color: {
                    main: "#e0e0e0"
                }
            }),

        },
    }
);

type Hint = "复习中" | "学习中"

function App() {
    const [progress, setProgress] = useState(50);
    const [progressColor, setProgressColor] = useState(State.primary);
    const [review, setReview] = useState(0);
    const [learn, setLearn] = useState(0);
    const [current, setCurrent] = useState(0);
    const [duration, setDuration] = useState(0);
    const [hint, setHint] = useState<Hint>("复习中");

    const [userID, setUserID] = useLocalStorage<string>("userID");
    const [reviewTarget, setReviewTarget] = useLocalStorage<number>(`reviewTarget_${userID}_${getDate()}`);
    const [remoteCache, setRemoteCache] = useState(true);

    const [userIDDialogFlag, setUserIDDialogFlag] = useToggle(false);
    const [reviewTargetDialogFlag, setReviewTargetDialogFlag] = useToggle(false);
    const [snackbarFlag, setSnackbarFlag] = useToggle(false);
    const [initFlag, setInitFlag] = useToggle(false);
    const [running, setRunning] = useToggle(userID === undefined);

    const userIDInput = createRef<any>();
    const reviewTargetInput = createRef<any>();

    const wakeLock = useRef<WakeLockSentinel>();

    useInterval(() => {
        learnUpdate();
    }, running ? 5000 : null);

    const reviewTargetFetch = useCallback(() => {
        setRemoteCache(false);
        const updateFn = async () => {
            const resp = await fetch(`${KV_ENDPOINT}/reviewTarget_${userID}`, {
                method: "GET",
                headers: {
                    "Token": TOKEN
                }
            });
            if (resp.status !== 404) {
                const rt = await resp.json();
                setReviewTarget(rt);
            }
            setRemoteCache(true);
        };
        updateFn();
    }, [setReviewTarget, userID]);

    const cacheClear = useCallback(() => {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith("reviewTarget")) {
                if (!key.endsWith(getDate())) {
                    window.localStorage.removeItem(key);
                }
            }
        }
    }, []);

    const learnUpdate = useCallback(() => {
        const updateFn = async () => {
            await fetch(`${BBDC_ENDPOINT}/bb/dashboard/profile/search?userId=${userID}`)
                .then(res => res.json())
                .then(res => {
                    const data = res["data_body"]["learnList"].filter((item: { [x: string]: string; }) => {
                        return item["date"] === "今日";
                    })[0];
                    const duration = res["data_body"]["durationList"].filter((item: { [x: string]: string; }) => {
                        return item["date"] === "今日";
                    })[0]["duration"];
                    setLearn(data["learnNum"]);
                    setReview(data["reviewNum"]);
                    setDuration(duration);
                    setInitFlag(true);
                });
        };
        updateFn();
    }, [setInitFlag, userID]);

    const userIDInputClose = () => {
        const id: string = userIDInput.current.value;
        const reg = /\d*/;
        if (reg.test(id)) {
            setUserID(id);
            setUserIDDialogFlag(false);
        }
    };

    const reviewTargetClose = () => {
        const target = Number(reviewTargetInput.current.value);
        if (isNaN(target) || target === 0) {
            setSnackbarFlag(true);
            return;
        }
        setReviewTarget(target + review);
        setReviewTargetDialogFlag(false);

        const fn = async () => {
            const expire = Math.floor(new Date().setHours(23, 59, 59, 999) / 1000);
            const url = new URL(`${KV_ENDPOINT}/reviewTarget_${userID}`);
            url.searchParams.append("expiration", expire.toString());
            await fetch(url.toString(), {
                method: "PUT",
                headers: {
                    "Token": TOKEN
                },
                body: JSON.stringify(target + review)
            });
        };
        fn();
    };

    const snackbarClose = () => {
        setSnackbarFlag(false);
    };

    const handleSetReviewTarget = () => {
        learnUpdate();
        setReviewTargetDialogFlag(true);
    };

    useEffect(() => {
        if (!('wakeLock' in navigator)) {
            console.warn("WakeLock API not supported.");
            return;
        }
        const requestLock = async () => {
            wakeLock.current = await navigator.wakeLock.request('screen');
        };

        if (document.visibilityState === 'visible') {
            requestLock();
        }

        document.addEventListener("visibilitychange", async function () {
            if (document.visibilityState === 'visible') {
                await requestLock();
            } else {
                if (wakeLock.current) {
                    await wakeLock.current.release();
                }
            }
        });
    }, []);

    useEffect(() => {
        document.addEventListener("visibilitychange", function () {
            if (document.visibilityState === 'visible') {
                setRunning(true);
            } else {
                setRunning(false);
            }
        });
    }, [setRunning]);

    useEffect(() => {
        if (!userID) {
            setUserIDDialogFlag(true);
        } else {
            cacheClear();
            learnUpdate();
            if (!reviewTarget) {
                reviewTargetFetch();
            }
        }
    }, [learnUpdate, reviewTargetFetch, userID, setUserIDDialogFlag, reviewTarget, cacheClear]);


    useEffect(() => {
        if (isReview(learn, review, reviewTarget)) { // reviewing
            setProgressColor(State.info);
            setHint("复习中");
            setCurrent(review);
            if (reviewTarget && reviewTarget !== 0) {
                const progress = review / reviewTarget * 100;
                setProgress(progress);
            } else {
                setProgress(100);
            }
        } else {
            setHint("学习中");
            setCurrent(learn);
            if (learn < TARGET) {
                setProgressColor(State.primary);
            } else {
                setProgressColor(State.success);
            }
            const progress = Math.min(100, learn / TARGET * 100);
            setProgress(progress);
        }
    }, [learn, review, reviewTarget]);

    return (
        <ThemeProvider theme={theme}>
            <Dialog open={userIDDialogFlag} onClose={userIDInputClose}
            >
                <DialogTitle>用户 ID 不可用</DialogTitle>
                <DialogContent>
                    <DialogContentText
                        style={{
                            minWidth: "30vw"
                        }}>
                        请输入不背单词用户 ID
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="User ID"
                        inputRef={userIDInput}
                        type="text"
                        fullWidth
                        variant="standard"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={userIDInputClose}>保存</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={reviewTargetDialogFlag}
                    onClose={handleSetReviewTarget}
            >
                <DialogTitle>需复习单词数</DialogTitle>
                <DialogContent>
                    <DialogContentText
                        style={{
                            minWidth: "30vw"
                        }}>
                        请输入需复习单词数
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        inputRef={reviewTargetInput}
                        type="text"
                        fullWidth
                        variant="standard"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setReviewTargetDialogFlag(false);
                    }}>取消</Button>
                    <Button onClick={reviewTargetClose}>保存</Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={snackbarFlag}
                autoHideDuration={3000}
                onClose={snackbarClose}
                message="不是有效的数字"
            />
            <CssBaseline/>
            <ParticlesBg type="cobweb" color="#b3dbf1" bg={true}/>
            {!(initFlag && userID) ? <h1 className="App" style={{
                    margin: 0,
                }}>Loading...</h1> :
                <div className="App"
                     id="app"
                >
                    <div style={{
                        position: "relative",
                        minHeight: "100vh",
                        minWidth: "100vw",
                    }}>
                        <div
                            className={"middle"}
                            style={{
                                zIndex: 0,
                                opacity: 0.04,
                                fontSize: "min(6em, 20vw)",
                            }}>
                            <h1
                                style={{
                                    margin: 0,
                                }}>{duration}</h1>
                        </div>
                        <div
                            className={"middle"}
                            style={{
                                zIndex: 1
                            }}>
                            <CircularProgress
                                thickness={2.4}
                                variant="determinate"
                                value={100}
                                color={"bg"}
                                size={"20rem"}/>
                        </div>
                        <div
                            className={"middle"}
                            style={{
                                zIndex: 2,
                            }}>
                            <CircularProgress
                                variant="determinate"
                                thickness={2.4}
                                value={progress}
                                color={progressColor}
                                size={"20rem"}/>
                        </div>
                        <div
                            className={"middle"}
                            style={{
                                zIndex: 3,
                            }}>
                            <h1
                                style={{
                                    margin: 0,
                                }}>
                                {hint}
                            </h1>
                            {!isReview(learn, review, reviewTarget) ?
                                <h4
                                    style={{
                                        marginBottom: "8px",
                                        marginTop: "8px"
                                    }}>
                                    {current} / {TARGET}
                                </h4> : (!remoteCache) ? <h4
                                    style={{
                                        marginBottom: "8px",
                                        marginTop: "8px",
                                        fontStyle: "initial",
                                        fontWeight: "initial",
                                    }}>
                                    Loading...
                                </h4> : ((!reviewTarget) ? <Button
                                    style={{
                                        marginTop: "24px"
                                    }}
                                    variant="outlined"
                                    onClick={handleSetReviewTarget}>
                                    设置复习目标
                                </Button> : <h4
                                    style={{
                                        marginBottom: "8px",
                                        marginTop: "8px"
                                    }}>
                                    {current} / {reviewTarget}
                                </h4>)}
                        </div>
                    </div>
                </div>}
        </ThemeProvider>
    );
}

export default App;
