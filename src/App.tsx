// noinspection JSIgnoredPromiseFromCall

import React, {createRef, useCallback, useEffect, useState} from 'react';
import './App.css';
import {
    Button,
    CircularProgress,
    createTheme, CssBaseline,
    Dialog, DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle, Snackbar, TextField,
    ThemeProvider
} from "@mui/material";
import {target} from "./config";
import {useInterval, useLocalStorage, useToggle} from "react-use";
import {getDate} from "./utils";
import CanvasNest from 'canvas-nest.js';

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

    const [userIDDialogFlag, setUserIDDialogFlag] = useToggle(false);
    const [reviewTargetDialogFlag, setReviewTargetDialogFlag] = useToggle(false);
    const [snackbarFlag, setSnackbarFlag] = useToggle(false);
    const [initFlag, setInitFlag] = useToggle(false);

    useInterval(() => {
        update();
    }, userID ? 5000 : null);

    const update = useCallback(() => {
        const updateFn = async () => {
            try {
                await fetch(`https://rproxy.learningman.top/bbdc/bb/dashboard/profile/search?userId=${userID}`)
                    .then(res => res.json())
                    .then(res => {
                        const data = res["data_body"]["learnList"].filter((item: { [x: string]: string; }) => {
                            return item["date"] === "今日"
                        })[0];
                        const duration = res["data_body"]["durationList"].filter((item: { [x: string]: string; }) => {
                            return item["date"] === "今日"
                        })[0]["duration"];
                        setLearn(data["learnNum"]);
                        setReview(data["reviewNum"]);
                        setDuration(duration);
                        setInitFlag(true);
                    })
            } catch (e) {
                console.error("Network Error")
                console.error(e)
            }
        }
        updateFn();
    }, [setInitFlag, userID]);

    const userIDInput = createRef<any>()
    const reviewTargetInput = createRef<any>()

    const userIDInputClose = () => {
        const id: string = userIDInput.current.value;
        const reg = /\d*/
        if (reg.test(id)) {
            setUserID(id);
            setUserIDDialogFlag(false);
        }
    };

    const reviewTargetClose = () => {
        const target = Number(reviewTargetInput.current.value);
        if (isNaN(target) || target === 0) {
            setSnackbarFlag(true)
            return
        }
        setReviewTarget(target + review);
        setReviewTargetDialogFlag(false);
    };

    const snackbarClose = () => {
        setSnackbarFlag(false)
    }

    const handleSetReviewTarget = () => {
        setReviewTargetDialogFlag(true);
    }

    useEffect(() => {
        // clear localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith("reviewTarget")) {
                if (!key.endsWith(getDate())) {
                    window.localStorage.removeItem(key);
                }
            }
        }
        const app = document.getElementById("app");
        if (app) {
            new CanvasNest(app, {
                opacity: 0.3,
                count: 50
            });
        } else {
            console.error("CanvasNest Error")
        }
    }, [])

    useEffect(() => {
        if (!userID) {
            setUserIDDialogFlag(true);
        } else {
            update();
        }
    }, [update, userID, setUserIDDialogFlag])

    useEffect(() => {
        if (learn === 0 && (!reviewTarget || (reviewTarget && review <= reviewTarget))) { // reviewing
            setProgressColor(State.info)
            setHint("复习中")
            setCurrent(review)
            if (reviewTarget && reviewTarget !== 0) {
                const progress = review / reviewTarget * 100;
                setProgress(progress)
            } else {
                setProgress(100)
            }
        } else {
            setHint("学习中")
            setCurrent(learn)
            if (learn < target) {
                setProgressColor(State.primary)
            } else {
                setProgressColor(State.success)
            }
            const progress = Math.min(100, learn / target * 100);
            setProgress(progress)
        }
    }, [learn, review, reviewTarget])

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
            <Dialog open={reviewTargetDialogFlag} onClose={handleSetReviewTarget}
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
                        setReviewTargetDialogFlag(false)
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
            <div className="App"
                 id="app"
                 style={{
                     visibility: (initFlag && userID) ? "visible" : "hidden"
                 }}>
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
                        {learn !== 0 ?
                            <h4
                                style={{
                                    marginBottom: "8px",
                                    marginTop: "8px"
                                }}>
                                {current} / {target}
                            </h4> : (!reviewTarget) ? <Button
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
                            </h4>}
                    </div>
                </div>
            </div>
        </ThemeProvider>
    )
}

export default App;
