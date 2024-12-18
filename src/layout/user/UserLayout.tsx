import { ReactNode, useEffect, useState } from "react";
import Header from "./header/Header";
import Footer from "./footer/Footer";
import MenuFixed from "../../components/menu/MenuFixed";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../rtk/store/store";
import { clearNotify } from "../../rtk/slice/notify-slice";
import NotificationButton from "../../components/notify/NotificationButton";
import MessageView from "../../pages/user/message/MessageView";
import AnimationComponent from "../../components/animation/AnimationComponent";
type Props = {
    children: ReactNode;
}

const UserLayout = ({ children }: Props) => {
    const [scrollPosition, setScrollPosition] = useState<number>(0);
    const [fixedSearch, setFixedSearch] = useState<boolean>(false);
    const notify = useSelector((state: RootState) => state.notification)
    const dispatch = useDispatch();
    useEffect(() => {
        const timer = setTimeout(() => {
            dispatch(clearNotify())
        }, 2000);

        // Dọn dẹp timeout khi component bị hủy hoặc message thay đổi
        return () => clearTimeout(timer);
    }, [notify, dispatch]);
    const handleScroll = () => {
        const position = window.scrollY;
        if (position <= 100)
            setScrollPosition(position);
    };

    useEffect(() => {
        window.addEventListener("scroll", handleScroll);
        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    useEffect(() => {
        if (scrollPosition >= 35) {
            setFixedSearch(true);
        } else {
            setFixedSearch(false);
        }
    }, [scrollPosition]);

    return <>
        <MenuFixed fixedSearch={fixedSearch} />
        <Header />
        <div style={{
            marginTop: 80,
            paddingBottom: 20,
            paddingTop: 20
        }}>{children}</div>
        <MessageView />
        <Footer />
        <AnimationComponent />
        {notify.type && <NotificationButton type={notify.type} message={notify.message} />}
    </>

}

export default UserLayout;