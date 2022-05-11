import { Button, Space, Drawer, Slider } from "antd"
import classes from './index.module.scss'
import { useRef, useReducer, useState, useEffect } from 'react'

function useDrawerVisible(){
  const [drawerVisible, setDrawerVisible] = useState(false)
  function showDrawer(){
    setDrawerVisible(true)
  }
  function closeDrawer(){
    setDrawerVisible(false)
  }
  return [drawerVisible, showDrawer, closeDrawer]
}

function actionReducer(actionObj, msg){
  let actions = [...actionObj.actions]
  let cur = actionObj.cur
  const { type, action, setPosition } = msg
  switch (type) {
    case 'push':
      // 清空当前位置之后的action      
      actions.splice(cur + 1)
      actions.push(action)
      return {
        actions,
        cur: cur + 1
      }
    case 'undo': 
      if(cur < 0) return actionObj
      if(cur !== 0){
        const pos = actions[cur - 1].param.position
        setPosition(pos)
      }
      return {
        actions,
        cur: cur - 1
      }
    case 'redo': 
      if(actions.length && cur < actions.length - 1){
        if(cur !== 0){
          const pos = actions[cur + 1].param.position
          setPosition(pos)
        }
        return {
          actions,
          cur: cur + 1
        }
      }
      return actionObj
    default:
      throw new Error('actionReducer error')
  }
}
function useActions(setPosition){
  const [actionObj, dispatch] = useReducer(actionReducer, {cur: -1, actions: []})
  function pushAction(action){
    dispatch({type: 'push', action: action})
  }
  function undoAction(){
    dispatch({type: 'undo', setPosition})
  }
  function redoAction(){
    dispatch({type: 'redo', setPosition})
  }
  return [actionObj, pushAction, undoAction, redoAction]
}

function useShowDrawer(actionObj, showDrawer, closeDrawer){
  useEffect(()=>{
    const { cur, actions } = actionObj
    if(cur !== -1 && actions[cur].state === 'drawing'){
      showDrawer()
    }
    else {
      closeDrawer()
    }
  }, [actionObj])
}

function useCanvasDrawer(actionObj, draw){
  useEffect(()=>{
    draw()
  }, [actionObj])
}

function useCanvasSize(canvasBoxRef){
  const [size, setSize] = useState({width: 0, height: 0})
  useEffect(()=>{
    if(canvasBoxRef.current){
      const { width , height } = canvasBoxRef.current.getBoundingClientRect()
      setSize({width, height})
    }
  }, [canvasBoxRef.current])
  return [size]
}


function CircleDrawer(){
  const canvasRef = useRef()
  const canvasBoxRef = useRef()
  const [position, setPosition] = useState({x: 0, y: 0})
  const [drawerVisible, showDrawer, closeDrawer] = useDrawerVisible()
  const diameterRange = {defaultValue: 10, min: 1, max: 50}
  const [actionObj, pushAction, undoAction, redoAction] = useActions(setPosition)
  const [sliderValue, setSliderValue] = useState(diameterRange.defaultValue)
  const [size] = useCanvasSize(canvasBoxRef)
  


  function boardClick(e){
    const canvasDom = canvasRef.current
    // canvas 相对于浏览器窗口位置
    const {left, top} = canvasDom.getBoundingClientRect()
    // 点击位置相对于浏览器窗口的位置
    const {clientX, clientY} = e
    const pos = {
      x: clientX - left,
      y: clientY - top
    }
    setPosition(pos)
    showDrawer()
    pushAction({
      name: 'drawCircle',
      param: {
        position: pos,
        diameter: diameterRange.defaultValue,
        style: {
          backgroundColor: 'rgb(211, 211, 211)'
        }
      },
      state: 'drawing'
    })
  }
  
  function undoDisable(){
    if(actionObj.cur === -1){
      return true
    }
    return false
  }
  function redoDisable(){
    const length = actionObj.actions.length 
    const cur = actionObj.cur
    if( length && length - 1 === cur){
      return true
    }
    return false
  }
  function sliderValueChange(value){
    setSliderValue(value)
  }
  function handleDrawerClose(){
    pushAction({
      name: 'drawCircle',
      param: {
        position,
        diameter: sliderValue,
        style: null
      },
      state: 'drawed'
    })
    closeDrawer()
    setSliderValue(diameterRange.defaultValue)
  }
  function handleUndoActionClick(){
    undoAction()
    // 设置位置
  }

  // 控制撤销与重做的时候是否显示抽屉
  useShowDrawer(actionObj, showDrawer, closeDrawer)
  
  function drawInCanvas(actions){
    const canvasDom = canvasRef.current
    const ctx = canvasDom.getContext('2d')
    // 先清空
    ctx.clearRect(0, 0, size.width, size.height)
    ctx.beginPath();
    actions.forEach(action=>{
      const { position, diameter, style } = action.param
      ctx.moveTo(position.x + diameter/2, position.y)
      ctx.arc(position.x, position.y, diameter/2, 0, Math.PI * 2, true); // 绘制
    })
    ctx.stroke();
  }

  // 绘制函数
  function draw(){
    const { cur, actions } = actionObj
    const shouldDrawActions = actions.filter((action, i)=>{
      if(action.state === 'drawed' && i <= cur){
        return true
      }
      else{
        return false
      }
    })
    if(cur >= 0 && actions[cur].state === 'drawing'){
      shouldDrawActions.push(actions[cur])
    }
    drawInCanvas(shouldDrawActions)
  }

  useCanvasDrawer(actionObj, draw)
  

  return (
    <div className={classes.box}>
      <div>
        <Space>
          <Button onClick={handleUndoActionClick} disabled={undoDisable()}>Undo</Button>
          <Button onClick={redoAction} disabled={redoDisable()}>Redo</Button>
        </Space>
      </div>
      <div className={classes.canvasBox} ref={canvasBoxRef}>
        <canvas className={classes.working} 
          onClick={boardClick}
          ref={canvasRef}
          width={size.width}
          height={size.height}
          // hei
        >

        </canvas>
        <Drawer
          title={`Adjust diameter of Circle at (${position.x}, ${position.y})`}
          visible={drawerVisible}
          onClose={handleDrawerClose}
          placement="bottom"
          getContainer={false}
          style={{ position: 'absolute'}}
          height={'30%'}
        >
          <Slider 
            {...diameterRange}
            value={sliderValue}
            onChange={sliderValueChange}
          ></Slider>
        </Drawer>
      </div>
    </div>
  )
}

export default CircleDrawer