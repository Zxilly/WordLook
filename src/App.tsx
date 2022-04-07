// noinspection JSIgnoredPromiseFromCall

import React, {createRef, useEffect} from 'react';
import './App.css';
import CircularProgress from '@mui/material/CircularProgress';
import {
    Button,
    createTheme,
    Dialog, DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle, Snackbar, TextField,
    ThemeProvider
} from "@mui/material";
import {target} from "./config";

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
    const [progress, setProgress] = React.useState(50);
    const [state, setState] = React.useState(State.primary);
    const [review, setReview] = React.useState(0);
    const [reviewTarget, setReviewTarget] = React.useState(0);
    const [learn, setLearn] = React.useState(0);
    const [current, setCurrent] = React.useState(0);
    const [hint, setHint] = React.useState<Hint>("复习中");

    const [open, setOpen] = React.useState(false);
    const [open2, setOpen2] = React.useState(false);
    const [open3, setOpen3] = React.useState(false);

    const valueRef = createRef<any>()
    const valueRef2 = createRef<any>()

    const handleClose = () => {
        const id: string = valueRef.current.value;
        const reg = /[0-9]*/
        if (reg.test(id)) {
            localStorage.setItem("userID", id)
        }
        window.location.reload();
    };

    const handleClose2 = () => {
        const target = Number(valueRef2.current.value);
        if (isNaN(target) || target === 0) {
            setOpen3(true)
            return
        }
        setReviewTarget(target + review);
        setOpen2(false);
    };

    const handleClose3 = () => {
        setOpen3(false)
    }

    const handleSetReviewTarget = () => {
        setOpen2(true);
    }

    useEffect(() => {
        const update = async (userID: string) => {
            try {
                await fetch(`https://rproxy.learningman.top/bbdc/bb/dashboard/profile/search?userId=${userID}`)
                    .then(res => res.json())
                    .then(res => {
                        const data = res["data_body"]["learnList"].filter((item: { [x: string]: string; }) => {
                            return item["date"] === "今日"
                        })[0];
                        setLearn(data["learnNum"]);
                        setReview(data["reviewNum"]);
                    })
            } catch (e) {
                console.error("Network Error")
                console.error(e)
            }
        }

        const userID = localStorage.getItem("userID");

        if (userID) {
            update(userID);
            setInterval(() => {
                update(userID!!)
            }, 1000 * 5);
        } else {
            setOpen(true);
        }
    }, [])

    useEffect(() => {
        if (learn === 0) { // reviewing
            setState(State.info)
            setHint("复习中")
            setCurrent(review)
            if (reviewTarget !== 0) {
                const progress = review / reviewTarget * 100;
                setProgress(progress)
            } else {
                setProgress(100)
            }
        } else {
            setHint("学习中")
            if (learn < target) {
                setState(State.primary)
            } else {
                setState(State.success)
            }
            const progress = Math.min(100, learn / target * 100);
            setProgress(progress)
        }
    }, [learn, review, reviewTarget])

    return (
        <ThemeProvider theme={theme}>
            <Dialog open={open} onClose={handleClose}
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
                        inputRef={valueRef}
                        type="text"
                        fullWidth
                        variant="standard"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>保存</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={open2} onClose={handleSetReviewTarget}
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
                        inputRef={valueRef2}
                        type="text"
                        fullWidth
                        variant="standard"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setOpen2(false)
                    }}>取消</Button>
                    <Button onClick={handleClose2}>保存</Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={open3}
                autoHideDuration={3000}
                onClose={handleClose3}
                message="复习目标不是有效的数字"
            />
            <div className="App">
                <div style={{
                    position: "relative",
                    minHeight: "100vh",
                    minWidth: "100vw",
                }}>
                    <div
                        className={"middle"}
                        style={{
                            zIndex: 1,
                        }}>
                        <CircularProgress
                            variant="determinate"
                            value={progress}
                            color={state}
                            size={"20rem"}/>
                    </div>
                    <div
                        className={"middle"}
                        style={{
                            zIndex: 0
                        }}>
                        <CircularProgress
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
                        <h1
                            style={{
                                margin: 0,
                            }}>
                            {hint}
                        </h1>
                        {learn !== 0 ?
                            <h1
                                style={{
                                    marginBottom: "8px",
                                    marginTop: "8px"
                                }}>
                                {current} / {target}
                            </h1> : reviewTarget === 0 ? <h1
                                style={{
                                    marginBottom: "8px",
                                    marginTop: "8px"
                                }}
                                onClick={handleSetReviewTarget}>
                                {current}
                            </h1> : <h1
                                style={{
                                    marginBottom: "8px",
                                    marginTop: "8px"
                                }}>
                                {current} / {reviewTarget}
                            </h1>}
                    </div>
                </div>
            </div>
        </ThemeProvider>
    )
}

export default App;
