import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  // Collapse,
  Container,
  Form,
  Row,
} from "react-bootstrap";
import ImageDetails from "../../../components/image-details/ImageDetails";
import Rating from "../../../components/rating/Rating";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import "./product-detail.scss";
import Address from "../../../components/address/Address";
import Comment from "./CommentComp";
import { Link, useParams } from "react-router-dom";
import {
  useGetProductByUrlQuery,
  useGetProductsRecommendQuery,
} from "../../../services/product.service";
import {
  calcDiscountPrice,
  calcPercentDiscount,
  calcPromotion,
  convertPrice,
} from "../../../utils/convert-price";
import RenderVideo from "../../../components/image-details/RenderVideo";
import ProductAttribute from "./ProductAttribute";
import {
  useLazyGetVariantsByProductIdQuery,
  useLazyGetVariantsQuery,
} from "../../../services/variant.service";
import { VariantResponse } from "../../../dtos/response/variant/variant-response";
import { useCheckLoginQuery } from "../../../services/auth.service";
import {
  useAddToCartMutation,
  useGetCartByUserIdQuery,
} from "../../../services/cart.service";
import { useGetAddressByUserIdQuery } from "../../../services/address.service";
import RenderImage from "../../../components/image-details/RenderImage";
import { useDispatch } from "react-redux";
import { setNotify } from "../../../rtk/slice/notify-slice";
import { motion } from "framer-motion";
import ProductEmpty from "./ProductEmpty";
import { useGetListCategoryQuery } from "../../../services/category.service";
import Countdown from "react-countdown";
import SkeletonWrapper from "../../../components/query-wrapper/SkeletonWrapper";

import {
  connect,
  isConnected,
  stompClient,
} from "../../../websocket/websocket-config";

import { Message } from "stompjs";
import { pageQueryHanlder } from "../../../utils/query-handler";
import { useGetCommentsQuery } from "../../../services/comment.service";
import ListProduct from "../../../components/products/ListProduct";
import { useGetBrandsQuery } from "../../../services/brand.service";
import logo from "../../../assets/logo/logo.jpg";
import { redirect } from "../../../utils/location";
import QueryWrapper from "../../../components/query-wrapper/QueryWrapper";
import { formatRating } from "../../../utils/covert-rating";

function ProductDetail() {
  const [quantity, setQuantity] = useState(1);
  const { key } = useParams();

  const {
    data: resProduct,
    isSuccess: getProductSuccess,
    isFetching: getProductFetching,
    isError: getProductError,
  } = useGetProductByUrlQuery(key || "");
  const {
    data: categories,
    isSuccess: getCategoriesSuccess,
    isFetching: getCategoriesFetching,
    isError: getCategoriesError,
  } = useGetListCategoryQuery(resProduct?.data.categories || [], {
    skip:
      !Array.isArray(resProduct?.data.categories) ||
      resProduct?.data.categories.length === 0,
  });

  useEffect(() => {
    if (getProductSuccess && resProduct.data.productName) {
      document.title = resProduct.data.productName;
    }
    return () => {
      document.title = "oson";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getProductSuccess]);
  const [variantByProductId, { data }] = useLazyGetVariantsByProductIdQuery();
  const product = resProduct?.data;
  const paramsBrand = pageQueryHanlder(1, 40, [
    { field: "id", operator: "=", value: product?.brandId || "" },
  ]);
  const { data: brandData } = useGetBrandsQuery(paramsBrand);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [images, setIamges] = useState<any[]>([]);
  const [startIndex, setStartIndex] = useState(0);
  const [selectValue1, setSelectValue1] = useState("");
  const [selectValue2, setSelectValue2] = useState("");
  const [getVariant] = useLazyGetVariantsQuery();
  const [variant, setVariant] = useState<VariantResponse | null>();
  const [productPrice, setProductPrice] = useState(0);
  const [disabledBtn, setDisabledBtn] = useState<boolean>(true);
  const { data: user, isSuccess: loginSuccess } = useCheckLoginQuery();
  const { data: queryCart, refetch } = useGetCartByUserIdQuery(
    user?.data?.id || "",
    {
      skip: !loginSuccess || !user?.data?.id,
    }
  );
  const cart = useMemo(() => {
    return queryCart?.data || [];
  }, [queryCart?.data]);
  const [addToCart] = useAddToCartMutation();
  const dispatch = useDispatch();
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [rotate, setRotate] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [rating, setRanting] = useState<string>("");
  const [ratingSearch, setRantingSearch] = useState<string>("");
  const param = pageQueryHanlder(1, 10, [
    { field: ratingSearch, operator: "=", value: rating },
  ]);
  const { data: dataComment, refetch: refetchComment } = useGetCommentsQuery(
    {
      productId: product?.id || "",
      params: param,
    },
    { skip: !getProductSuccess || !product?.id }
  );
  const [currentPageComment, setCurrentPageComment] = useState(1);
  const totalPages = dataComment?.data.totalPage || 0;
  const handlePageChange = (page: number) => {
    setCurrentPageComment(page);
  };
  const {
    data: queryRecommendResult,
    isFetching: getProductRecommendFetching,
  } = useGetProductsRecommendQuery(
    {
      productId: product?.numId,
      type: "content-filtering",
    },
    { skip: !getProductSuccess || !product?.id }
  );

  const handleFilterCommnet = (field: string, value: string) => {
    setRantingSearch(field);
    setRanting(value);
  };

  useEffect(() => {
    if (getProductSuccess) {
      if (!isConnected()) {
        connect(onConnected, onError);
      } else if (stompClient) {
        stompClient.subscribe("/topic/" + product?.id, onCommentReceived, {
          id: product?.id,
        });
      }
      return () => {
        if (isConnected() && stompClient) {
          stompClient.unsubscribe(`${product?.id}`);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stompClient, getProductSuccess]);

  const onConnected = () => {
    console.log("Connected to websocket server");
    if (isConnected() && stompClient) {
      stompClient.subscribe("/topic/" + product?.id, onCommentReceived, {
        id: product?.id,
      });
    }
  };
  const onCommentReceived = (comment: Message) => {
    const commentResponse = JSON.parse(comment.body);
    console.log(commentResponse);
    refetchComment();
  };
  const onError = () => {
    console.log("Error connecting to websocket server");
  };

  const handleAdd = () => {
    setIsVisible(true);
    const cartElement = document.getElementById("cart-motion-id");
    if (cartElement) {
      const iconRect = cartElement.getBoundingClientRect();
      setX(iconRect.left + window.scrollX - 1250);
      setY(iconRect.top + window.scrollY - 270);
      setRotate(0);
    }
  };
  const { data: address } = useGetAddressByUserIdQuery(user?.data?.id || "", {
    skip: !loginSuccess || !user?.data?.id,
  });

  const onSelect = (value: string, url: string, index: number) => {
    const currentUrl = images.indexOf(
      images.find((img) => img.original === url)
    );
    if (currentUrl !== -1) {
      setStartIndex(currentUrl);
    }
    if (index === 0) {
      setSelectValue1(value);
    }
    if (index === 1) {
      setSelectValue2(value);
    }
  };

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant",
    });
    setVariant(null);
  }, [key]);

  useEffect(() => {
    if (variant) {
      setProductPrice(variant.price);
      if (variant.quantity > 0) {
        setDisabledBtn(false);
      } else {
        setDisabledBtn(true);
      }
    } else {
      setProductPrice(product?.regularPrice || 0);
      setDisabledBtn(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  useEffect(() => {
    const getVariantByAttrValue = async () => {
      try {
        if (selectValue1 !== "" && selectValue2 != "") {
          const data = await getVariant({
            productId: product?.id || "",
            attr1: selectValue1,
            attr2: selectValue2,
          }).unwrap();
          setVariant(data.data);
        } else if (selectValue1 !== "" && selectValue2 === "") {
          if (product?.attributes?.length === 1) {
            const data = await getVariant({
              productId: product?.id || "",
              attr1: selectValue1,
            }).unwrap();
            setVariant(data.data);
          }
        }
      } catch (error) {
        console.log(error);
      }
    };
    getVariantByAttrValue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectValue1, selectValue2]);

  useEffect(() => {
    if (getProductSuccess) {
      const imgs = [];

      const newImages = product?.images.map((image) => ({
        original: image,
        thumbnail: image,
        renderItem: RenderImage,
      }));
      if (newImages) {
        imgs.push(...newImages);
      }
      const attrValues = product?.attributes?.[0]?.attributeValues;
      const attrValues1 = product?.attributes?.[1]?.attributeValues;
      if (attrValues) {
        const imgAttr = [];
        for (let i = 0; i < attrValues.length; i++) {
          if (attrValues[i].image) {
            imgAttr.push({
              original: attrValues[i].image,
              thumbnail: attrValues[i].image,
              renderItem: RenderImage,
            });
          }
        }
        imgs.push(...imgAttr);
      }
      if (attrValues1) {
        const imgAttr1 = [];
        for (let i = 0; i < attrValues1.length; i++) {
          if (attrValues1[i].image) {
            imgAttr1.push({
              original: attrValues1[i].image,
              thumbnail: attrValues1[i].image,
              renderItem: RenderImage,
            });
          }
        }
        imgs.push(...imgAttr1);
      }
      if (product && product.video) {
        imgs.push({
          original: product.video,
          thumbnail: "https://clipart-library.com/images/kT8kAaRyc.png",
          embedUrl: product.video,
          renderItem: RenderVideo,
        });
      }
      setIamges(imgs);
      setProductPrice(product?.regularPrice || 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getProductFetching, key]);

  const increaseQuantity = () => {
    if (variant && variant.quantity > quantity) setQuantity(quantity + 1);
  };
  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleAddToCart = async () => {
    setDisabledBtn(true);
    if (!user?.data) {
      window.location.href =
        "/auth/login?redirect-url=" + encodeURIComponent("product/" + key);
    } else {
      try {
        if (variant) {
          if (quantity > variant.quantity) {
            dispatch(
              setNotify({
                type: "error",
                message: "Không thể thêm vì số lượng sản phẩm không đủ",
              })
            );
            return;
          }
          if (quantity === 0) {
            dispatch(
              setNotify({
                type: "error",
                message: "Số lượng sản phẩm phải lớn hơn 0",
              })
            );
            return;
          }
          const cartItem = cart.find(
            (c) => c.variantResponse.id === variant.id
          );
          if (cartItem) {
            if (quantity > variant.quantity - cartItem.quantity) {
              dispatch(
                setNotify({
                  type: "error",
                  message: "Số lượng trong giỏ hàng vượt quá số lượng sản phẩm",
                })
              );
              return;
            }
          }
        }
        await addToCart({
          userId: user.data.id,
          productCart: {
            variantId: variant?.id || "",
            quantity: quantity,
          },
        }).unwrap();

        handleAdd();
        dispatch(
          setNotify({
            type: "success",
            message: "Đã thêm sản phẩm vào giỏ hàng",
          })
        );
        await refetch();
      } catch (error) {
        dispatch(
          setNotify({
            type: "error",
            message: "Thêm sản phẩm vào giỏ hàng thất bại",
          })
        );
        console.log(error);
      } finally {
        setDisabledBtn(false); // Đảm bảo nút được bật lại dù có lỗi hay không
      }
    }
  };

  const handleAddBuy = async () => {
    setDisabledBtn(true);
    if (!user?.data) {
      window.location.href =
        "/auth/login?redirect-url=" + encodeURIComponent("product/" + key);
    } else {
      try {
        if (variant) {
          if (quantity > variant.quantity) {
            dispatch(
              setNotify({
                type: "error",
                message: "Không thể thêm vì số lượng sản phẩm không đủ",
              })
            );
            return;
          }
          if (quantity === 0) {
            dispatch(
              setNotify({
                type: "error",
                message: "Số lượng sản phẩm phải lớn hơn 0",
              })
            );
            return;
          }
          const cartItem = cart.find(
            (c) => c.variantResponse.id === variant.id
          );
          if (cartItem) {
            if (quantity > variant.quantity - cartItem.quantity) {
              dispatch(
                setNotify({
                  type: "error",
                  message: "Số lượng trong giỏ hàng vượt quá số lượng sản phẩm",
                })
              );
              return;
            }
          }
        }
        await addToCart({
          userId: user.data.id,
          productCart: {
            variantId: variant?.id || "",
            quantity: quantity,
          },
        }).unwrap();
        await refetch();
        redirect("/cart?variant-id=" + variant?.id);
      } catch (error) {
        dispatch(
          setNotify({
            type: "error",
            message: "Thêm sản phẩm vào giỏ hàng thất bại",
          })
        );
        console.log(error);
      } finally {
        setDisabledBtn(false); // Đảm bảo nút được bật lại dù có lỗi hay không
      }
    }
  };
  useEffect(() => {
    const resVariantByProductId = async () => {
      if (resProduct?.data.attributes?.length === 0) {
        try {
          const resVariant = await variantByProductId(resProduct.data.id || "");
          if (resVariant.data?.data && resVariant?.data?.data.length > 0) {
            setVariant(resVariant?.data.data[0]);
          }
        } catch (error) {}
      }
    };
    resVariantByProductId();
  }, [resProduct?.data.attributes]);
  return (
    <QueryWrapper
      queriesError={[getCategoriesError, getProductError]}
      queriesSuccess={[!getCategoriesFetching, !getProductFetching]}
    >
      <Container className="mt-4 bg-light  border-radius-small">
        {/* {isLoading && <ModalLoading loading={isLoading} />} */}

        <div className="p-1 text-meidum d-flex gap-2 text-muted">
          <SkeletonWrapper
            queriesStatus={[getCategoriesSuccess && !getCategoriesFetching]}
            skHeight={20}
            skWidth={300}
          >
            <>
              {" "}
              <Link to={"/"} className="link-all">
                Trang chủ{" "}
                <i style={{ fontSize: 10 }} className="bi bi-chevron-right"></i>
              </Link>
              {categories?.data?.map((category) => {
                return (
                  <Link
                    className="link-all"
                    key={category.id}
                    to={"/" + category.urlPath}
                  >
                    {category.categoryName}{" "}
                    <i
                      style={{ fontSize: 10 }}
                      className="bi bi-chevron-right"
                    ></i>
                  </Link>
                );
              })}
            </>
          </SkeletonWrapper>
        </div>
        <SkeletonWrapper
          queriesStatus={[getProductSuccess && !getProductFetching]}
          skHeight={500}
        >
          <Row className="align-center ">
            <Col md={4} className="">
              <div className="border-radius-medium bg-white p-3">
                <div>
                  {" "}
                  <ImageDetails startIndex={startIndex} images={images} />
                </div>
              </div>
            </Col>
            <Col md={5} className=" ">
              <div className=" position-relative">
                {product?.totalQuantity === 0 && (
                  <div
                    className="position-absolute top-50 start-50 translate-middle"
                    style={{ zIndex: 50 }}
                  >
                    <ProductEmpty />
                  </div>
                )}
                <div
                  className={`bg-white border-radius-medium p-3 ${
                    product?.totalQuantity === 0 ? "blurred" : ""
                  }`}
                >
                  <div className="d-flex align-items-center mb-2 ">
                    {product?.brandId && (
                      <span className="text-muted">
                        Thương hiệu: {brandData?.data.items?.[0]?.brandName}
                      </span>
                    )}
                  </div>
                  <h5 className="mb-1">{product?.productName}</h5>

                  {product?.rating ? (
                    <div className="d-flex gap-2 pt-2 pb-2 w-100 align-items-center">
                      <span className="text-medium">
                        {formatRating(product.rating)}
                      </span>
                      <Rating
                        size="text-medium"
                        variant="secondary"
                        star={product.rating}
                      />
                      <span className=" text-muted">({product.reviews})</span>
                      <span></span>
                      <span className=" text-muted">
                        Đã bán: {product?.buyQuantity}
                      </span>
                    </div>
                  ) : (
                    <div className="d-flex gap-2 pt-2 pb-2 align-items-center">
                      <span className="text-muted">Chưa có đánh giá</span>
                      <span className=" text-muted">
                        Đã bán: {product?.buyQuantity}
                      </span>
                    </div>
                  )}
                  <div className="d-flex align-items-center mb-2">
                    <h4
                      className={
                        product?.promotion
                          ? "text-line-through text-large mb-0"
                          : "text-large mb-0"
                      }
                    >
                      {convertPrice(productPrice)}
                    </h4>
                    {product?.promotion && (
                      <small className=" ms-2 bg-light p-1 ps-2 pe-2 border-radius-medium">
                        -{" "}
                        {calcPercentDiscount(productPrice, product?.promotion)}%
                      </small>
                    )}

                    {product &&
                      product.promotion &&
                      product.promotion.endDate && (
                        <div className="ms-2">
                          Kết thúc trong:{" "}
                          <Countdown
                            date={
                              Date.now() +
                              (new Date(
                                product.promotion.endDate.toString()
                              ).getTime() - new Date().getTime() || 0)
                            }
                          />
                        </div>
                      )}
                  </div>

                  <div className="mb-2">
                    {product?.promotion && (
                      <div className="p-2 border border-radius-small">
                        <span className="text-medium">Giá sau khi giảm:</span>{" "}
                        <br />
                        <span className="text-large primary">
                          {calcPromotion(productPrice, product.promotion)}
                        </span>{" "}
                        <br />
                        <FontAwesomeIcon
                          color="blue"
                          icon={faCheck}
                          className="pe-2 ps-1 "
                        />
                        <span>
                          Giảm{" "}
                          {calcDiscountPrice(productPrice, product.promotion)}{" "}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    {product?.attributes?.map((attribute, index) => (
                      <ProductAttribute
                        productId={resProduct?.data.id || ""}
                        index={index}
                        attribute={attribute}
                        key={attribute.id}
                        onSelect={onSelect}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Col>
            <Col md={3}>
              <div className="d-flex justify-content-center border-radius-medium ">
                <Card
                  style={{ width: "100%", padding: "1rem", border: "none" }}
                >
                  <Row>
                    <Col className="d-flex justify-content-between">
                      <div className="d-flex align-items-center w-100 pb-2 border-bottom ">
                        <div className="d-flex align-items-center w-100 ">
                          <Link to={"/"}>
                            <img
                              src={logo}
                              width={80}
                              height={50}
                              style={{
                                borderRadius: 30,
                              }}
                            />
                          </Link>
                        </div>
                        <div>
                          {/* <div className="border p-2 border-radius-small">
                                                    <BsChatDots style={{ fontSize: 20 }} color="#f05d23" />
                                                </div> */}
                        </div>
                      </div>
                    </Col>
                  </Row>
                  <div style={{ position: "relative", height: "80px" }}>
                    <motion.div
                      className="box "
                      initial={{ opacity: 1 }}
                      style={{
                        opacity: "50%",
                        position: "absolute",
                        top: 0,
                        left: 0,
                      }}
                    >
                      {variant && (
                        <Row className="mt-3  ">
                          <Col>
                            <div className="d-flex  ">
                              <img
                                src={variant.image || product?.thumbnail}
                                alt="variant"
                                className="img-fluid img-ft"
                              />
                              <div className="ps-1">
                                <span>{variant.attributeValue1}</span> <br />
                                <span>{variant.attributeValue2}</span>
                              </div>
                            </div>
                          </Col>
                          <Col>
                            <div className="ps-1">
                              <span>Kho hàng: {variant.quantity}</span> <br />
                            </div>
                          </Col>
                        </Row>
                      )}
                    </motion.div>

                    {isVisible && (
                      <motion.div
                        className="box border"
                        animate={{
                          x: x, // Giảm giá trị x
                          y: y,
                          rotate,
                          scale: [1.5, 0.1],
                          opacity: [1, 0.5],
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 700,
                          damping: 100,
                          duration: 0.2,
                        }}
                        style={{
                          opacity: "50%",
                          position: "absolute",
                          top: 0,
                          left: 0,
                        }}
                        onAnimationComplete={() => setIsVisible(false)}
                      >
                        {product?.attributes &&
                        product.attributes.length > 0 ? (
                          variant && (
                            <Row className="mt-3 border ">
                              <Col>
                                <div className="d-flex  ">
                                  <img
                                    src={variant.image || product?.thumbnail}
                                    alt="variant"
                                    className="img-fluid img-ft"
                                  />
                                  <div className="ps-1">
                                    <span>{variant.attributeValue1}</span>{" "}
                                    <br />
                                    <span>{variant.attributeValue2}</span>
                                  </div>
                                </div>
                              </Col>
                              <Col>
                                <div className="ps-1">
                                  <span>Kho hàng: {variant.quantity}</span>{" "}
                                  <br />
                                </div>
                              </Col>
                            </Row>
                          )
                        ) : (
                          <Row className="mt-3 border ">
                            <Col>
                              <div className="d-flex  ">
                                <img
                                  src={product?.thumbnail}
                                  alt="variant"
                                  className="img-fluid img-ft"
                                />
                              </div>
                            </Col>
                            <Col>
                              <div className="ps-1">
                                <span>Kho hàng: {product?.totalQuantity}</span>{" "}
                                <br />
                              </div>
                            </Col>
                          </Row>
                        )}
                      </motion.div>
                    )}
                  </div>
                  {variant ? (
                    variant.quantity > 0 ? (
                      <>
                        <Row className="mt-3 ">
                          <Col className="d-flex justify-content-between align-items-center">
                            <span>Số Lượng</span>
                            <div>
                              <Button
                                variant="outline-secondary"
                                onClick={decreaseQuantity}
                              >
                                -
                              </Button>
                              <Form.Control
                                type="text"
                                value={quantity}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  const numberValue = Number(value);
                                  if (!isNaN(numberValue)) {
                                    setQuantity(numberValue);
                                  }
                                }}
                                className="text-center"
                                style={{
                                  width: "3rem",
                                  display: "inline-block",
                                  margin: "0 0.5rem",
                                }}
                              />
                              <Button
                                variant="outline-secondary"
                                onClick={increaseQuantity}
                              >
                                +
                              </Button>
                            </div>
                          </Col>
                        </Row>
                        <Row className="mt-3">
                          <Col className="d-flex justify-content-between">
                            <span>Tạm tính</span>
                            <span className="text-large">
                              {calcPromotion(
                                quantity * variant.price,
                                product?.promotion
                              )}
                            </span>
                          </Col>
                        </Row>
                      </>
                    ) : (
                      <>
                        <span className="text-muted">Hết hàng</span>
                      </>
                    )
                  ) : (
                    <></>
                  )}
                  {variant && (
                    <>
                      <Row className="mt-3">
                        <Col>
                          <Button
                            disabled={disabledBtn}
                            variant="danger"
                            className="w-100"
                            onClick={handleAddBuy}
                          >
                            Mua ngay
                          </Button>
                        </Col>
                      </Row>
                      <Row className="mt-2">
                        <Col>
                          <Button
                            onClick={handleAddToCart}
                            disabled={disabledBtn}
                            variant="outline-primary"
                            className="w-100"
                          >
                            Thêm vào giỏ hàng
                          </Button>
                        </Col>
                      </Row>
                    </>
                  )}
                </Card>
              </div>

              {address?.data && address?.data.length > 0 ? (
                <div className="bg-white mt-3 border-radius-medium p-1">
                  {" "}
                  <Address info={address.data[0]} />{" "}
                </div>
              ) : (
                <></>
              )}
            </Col>
          </Row>
          <Row>
            {product?.tags && (
              <Col md={9}>
                <div className="mt-3 border-radius-medium ">
                  <div
                    style={{ border: "none" }}
                    className="card border-radius-medium "
                  >
                    <div className="card-body border-radius-medium ">
                      <h5 className="card-title">Thông tin chi tiết</h5>
                      <table className="table text-muted ">
                        <tbody>
                          {product?.tags?.map((tag, idx) => (
                            <tr key={idx}>
                              <th scope="row">{tag.tagName}</th>
                              <td>{tag.tagValue}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </Col>
            )}
          </Row>
          <Row>
            <Col md={12}>
              <div className=" mt-3 border-radius-medium ">
                <div
                  style={{ border: "none" }}
                  className="card border-radius-medium "
                >
                  <div className="card-body border-radius-medium product-detail">
                    <h5 className="card-title">Mô tả sản phẩm</h5>
                    {/* <SimpleBar
                      // TODO: fix descriptionRef type safe
                      // ref={descriptionRef}
                      style={{ overflowY: "auto", maxHeight: "500px" }}
                    > */}
                    <div>
                      {product?.description.trimStart().startsWith("<") ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: product.description,
                          }}
                        />
                      ) : (
                        <pre className="text-align-start">
                          {product?.description}
                        </pre>
                      )}
                    </div>
                    {/* </SimpleBar> */}

                    {/* <div className=" d-flex justify-content-end">
                    <button className="toggle-btn" onClick={toggleCollapse}>
                      {isCollapsed ? "Xem thêm" : "Thu gọn"}
                    </button>
                  </div> */}
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </SkeletonWrapper>

        <Row>
          <Col md={12}>
            {product && (
              <Comment
                user={user?.data?.email || ""}
                comments={dataComment?.data.items || []}
                product={product}
                handleFilterCommnet={handleFilterCommnet}
                currentPageComment={currentPageComment}
                totalPages={totalPages}
                handlePageChange={handlePageChange}
              />
            )}
          </Col>
        </Row>
        <Row>
          <ListProduct
            products={queryRecommendResult?.data}
            title="Sản phẩm tương tự"
            loading={!getProductRecommendFetching}
          />
        </Row>
      </Container>
    </QueryWrapper>
  );
}

export default ProductDetail;
