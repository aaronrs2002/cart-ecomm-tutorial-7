import React, { useState, useEffect } from "react";
import axios from "axios";
import timestamp from "./timestamp";
import Validate from "./Validate";
import InventoryChart from "./InventoryChart";


const Inventory = (props) => {
    let [orderStatus, setOrderStatus] = useState("received");
    let [loaded, setLoaded] = useState(false);
    let [activeItem, setActiveItem] = useState();
    let [qtyOrdered, setQtyOrdered] = useState(0);
    let [allProductOrders, setAllProductOrders] = useState([]);
    let [orderQtys, setOrderQtys] = useState([]);
    //let [months, setMonths] = useState([]);
    let [totalOrdered, setTotalOrdered] = useState(0);

    let [purchaseQtys, setPurchaseQtys] = useState([]);
    let [purchaseMonths, setPurchaseMonths] = useState([]);
    let [purchaseLog, setPurchaseLog] = useState([]);
    let [totalPurchased, setTotalPurchased] = useState(0);

    const grabOrders = (name, monthList) => {
        axios.get("/api/inventory/" + name, props.config).then(
            (res) => {
                try {
                    if (res.data[0].status) {
                        setOrderStatus((orderStatus) => res.data[res.data.length - 1].status);
                        setActiveItem((activeItem) => res.data[res.data.length - 1].userTimestamp);
                        setQtyOrdered((qtyOrdered) => res.data[res.data.length - 1].quantity);
                        setAllProductOrders((allProductOrders) => res.data);



                        let tempMonths = monthList;
                        let tempOrderQtys = [];
                        for (let i = 0; i < tempMonths.length; i++) {
                            tempOrderQtys.push(0);
                        }

                        console.log("tempMonths:  " + tempMonths);
                        for (let i = 0; i < res.data.length; i++) {
                            if (res.data[i].status.indexOf("received") !== -1) {
                                let theMonth = res.data[i].status.substring(res.data[i].status.length - 19, res.data[i].status.length - 12);

                                if (tempMonths.indexOf(theMonth) !== -1) {
                                    tempOrderQtys[tempMonths.indexOf(theMonth)] = res.data[i].quantity + tempOrderQtys[tempMonths.indexOf(theMonth)];

                                } else {
                                    tempMonths = [...tempMonths, theMonth];
                                    setPurchaseMonths((purchaseMonths) => tempMonths);
                                    tempOrderQtys = [...tempOrderQtys, res.data[i].quantity];
                                }
                            }
                        }
                        let tempTotal = 0;
                        for (let i = 0; i < tempOrderQtys.length; i++) {
                            tempTotal = tempTotal + tempOrderQtys[i];
                        }

                        setTotalOrdered((totalOrdered) => tempTotal);
                        console.log("tempTotal: " + tempTotal + " - (typeof tempTotal): " + (typeof tempTotal));
                        console.log("tempOrderQtys: " + tempOrderQtys);
                        setOrderQtys((orderQtys) => tempOrderQtys);
                        // setMonths((months) => tempMonths);

                        //[{"userTimestamp":"aaron@web-presence.biz:2023-09-21T11:18:44","itemName":"mens e-tip gloves","quantity":1,"status":"ordering:aaron@web-presence.biz:2023-09-21T11:18:44"}]
                    }
                } catch (error) {
                    props.showAlert("No ordering data yet", "warning");
                    console.log("error: " + error);
                }
            }, (error) => {
                props.showAlert("There was a server side error: " + error, "danger");
            }
        )

    }


    //CLIENT SIDE UPDATE ITEMS TABLE
    const updateItemsTable = (qty) => {
        /*let tempQtySum = qty;
        for (let i = 0; i < allProductOrders.length; i++) {
            tempQtySum = tempQtySum + allProductOrders[i].quantity;
        }*/

        let updateData = {
            itemName: props.selectionObj.itemName,
            stockQty: Number(qty)
        }

        axios.put("/api/items/updateQty/", updateData, props.config).then(
            (res) => {
                if (res.data.affectedRows === 1) {
                    props.showAlert("Your order was sent to the database", "success");
                    props.GrabAllItems(sessionStorage.getItem("token"), props.userEmail);
                    props.switchFunc("add");
                } else {
                    props.showAlert("The items table did not update.", "warning");
                }

            }, (error) => {
                props.showAlert("There was a server side error: " + error, "danger");
            }
        )
    }


    const updateStatus = (status) => {

        const tempTimestamp = timestamp();
        let tempQty;
        let orderLog = {};
        if (status === "ordering") {
            Validate(["orderQty"]);
            if (document.querySelector(".error")) {
                props.showAlert("Please type in a number.", "warning");
                return false;
            }
            tempQty = document.querySelector("[name='orderQty']").value;
        }




        try {
            tempQty = Number(tempQty);
        } catch (error) {
            console.log("That is not a number: " + error);
            return false;
        }

        if (status === "ordering") {



            orderLog = {
                userTimestamp: props.userEmail + ":" + tempTimestamp,
                itemName: props.selectionObj.itemName,
                quantity: tempQty,
                status: status + ":" + props.userEmail + ":" + tempTimestamp
            }

            axios.post("/api/inventory/order-product", orderLog, props.config).then(
                (res) => {
                    if (res.data.affectedRows === 1) {
                        props.showAlert("Your order was sent to the database", "success");
                        grabOrders(props.selectionObj.itemName, purchaseMonths);
                        setOrderStatus((orderStatus) => status);
                        props.GrabAllItems(sessionStorage.getItem("token"), props.userEmail);

                    } else {
                        props.showAlert("We didn't find your product", "warning");
                    }

                }, (error) => {
                    props.showAlert("There was a server side error: " + error, "danger");
                }
            );

        } else {
            //CLIENT SIDE SUBMIT STATUS UPDATE
            orderLog = {
                userTimestamp: activeItem,
                status: status + ":" + props.userEmail + ":" + tempTimestamp
            }
            axios.put("/api/inventory/update-order-status/", orderLog, props.config).then(
                (res) => {
                    if (res.data.affectedRows === 1) {
                        props.showAlert("Your order was sent to the database", "success");
                        grabOrders(props.selectionObj.itemName, purchaseMonths);
                        setOrderStatus((orderStatus) => status);
                        //CLIENT SIDE UPDATE stockQty IN "items" table

                        let tempQtySum = 0;
                        for (let i = 0; i < allProductOrders.length; i++) {
                            tempQtySum = tempQtySum + allProductOrders[i].quantity;
                        }
                        setQtyOrdered((qtyOrdered) => tempQtySum);
                        updateItemsTable(tempQtySum);

                    } else {
                        props.showAlert("We didn't find your product", "warning");
                    }

                }, (error) => {
                    props.showAlert("There was a server side error: " + error, "danger");
                }
            );

        }

    }




    useEffect(() => {
        if (loaded === false && props.selectionObj.itemName) {


            axios.get("/api/purchaseLog/ordersByName/" + props.selectionObj.itemName, props.config).then(
                (res) => {

                    let tempMonths = [];
                    let tempSoldQtys = [];
                    let tempTotal = 0;
                    for (let i = 0; i < res.data.length; i++) {

                        //aaron@test.com:2023-09-14T10:18:05
                        let theMonth = res.data[i].saleId.substring(res.data[i].saleId.indexOf(":") + 1, res.data[i].saleId.indexOf(":") + 8);
                        if (tempMonths.indexOf(theMonth) !== -1) {
                            tempSoldQtys[tempMonths.indexOf(theMonth)] = 1 + tempSoldQtys[tempMonths.indexOf(theMonth)];
                            tempTotal = tempTotal + 1;

                        } else {
                            tempMonths.push(theMonth);
                            tempSoldQtys.push(1);
                        }
                    }

                    tempMonths = tempMonths.sort(((a, b) => a - b));
                    console.log("tempMonths: " + tempMonths);
                    setPurchaseMonths((purchaseMonths) => tempMonths);
                    setTotalPurchased((totalPurchased) => tempTotal);
                    setPurchaseQtys((purchaseQtys) => tempSoldQtys);

                    setPurchaseLog((purchaseLog) => res.data);

                    grabOrders(props.selectionObj.itemName, tempMonths);



                }, (error) => {
                    props.showAlert("That did not work.", "danger");
                }
            )


            setLoaded((loaded) => true);
        }
    });


    if (document.querySelector("[name='stockQty']")) {
        document.querySelector("[name='stockQty']").value = "In stock: " + (parseInt(totalOrdered) - parseInt(totalPurchased)) + " Total ordered: " + totalOrdered + " - Total sold: " + totalPurchased;
        //console.log("totalOrdered: " + totalOrdered + " - totalPurchased: " + totalPurchased + " - purchaseMonths: " + purchaseMonths);
        //console.log("totalOrdered - tempTotal: " + (parseInt(totalOrdered) - parseInt(tempTotal)));
    }
    return (
        <React.Fragment>
            <div className="col-md-12 mb-5 pb-5">

                <h3 className={props.selectionObj.stockQty < 5 ? "text-danger" : "text-muted"}>Order more</h3>
                <p className={props.selectionObj.stockQty < 5 ? "text-danger" : "text-muted"}>Current Quantity: {(parseInt(totalOrdered) - parseInt(totalPurchased))}</p>


                {orderStatus.indexOf("received") !== -1 ?
                    <div className="input-group mb-3">
                        <input type="text" className="form-control" name="orderQty" placeholder="Number only" />
                        <button className="btn btn-outline-secondary" onClick={() => updateStatus("ordering")} >Order more</button>
                    </div> : <div role="alert" className={orderStatus.indexOf("received") !== -1 ? "alert alert-warning" : "alert alert-info"}>

                        <ul className="list-unstyled">
                            <li><h4>Last Quantity Ordered: {qtyOrdered}</h4></li>
                            <li><label>Order Status: {orderStatus}</label></li>
                            <li><i>Once the order is fulfilled, select "order received" below.</i></li>

                            <li><button className="btn btn-success w-100" onClick={() => updateStatus("received")}>Order Received</button></li>
                        </ul>


                    </div>}
            </div>
            <div className="col-md-12 pb-5">
                {orderQtys.length > 0 && purchaseMonths.length > 0 && orderQtys.length > 0
                    ? <InventoryChart orderQtys={orderQtys} purchaseQtys={purchaseQtys} purchaseMonths={purchaseMonths} /> : <label>No orders</label>}
            </div>
        </React.Fragment>
    )

}

export default Inventory;

/*
        const ordered = this.props.orderQtys;
        const timeStamp = this.props.purchaseMonths;
        const purchases = this.props.purchaseQtys
*/
