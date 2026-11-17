package com.example.mcs.mapper;

import com.example.mcs.dto.UserAdminQueryDTO;
import com.example.mcs.entity.SysUser;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SysUserMapper {
    SysUser selectByUsername(@Param("username") String username);
    SysUser selectById(@Param("id") Long id);
    List<SysUser> selectUserList(@Param("query") UserAdminQueryDTO query, @Param("offset") int offset, @Param("limit") int limit);
    List<SysUser> selectRecentUsers(@Param("limit") int limit);
    Long countUserList(@Param("query") UserAdminQueryDTO query);
    Long countTodayNewUsers();
    int insert(SysUser user);
    int update(SysUser user);
    int updateStatus(@Param("id") Long id, @Param("status") Integer status);
    int updatePassword(@Param("id") Long id, @Param("password") String password);
    int deleteById(@Param("id") Long id);

    String selectRoleCodeByUserId(@Param("userId") Long userId);
    Long selectRoleIdByCode(@Param("roleCode") String roleCode);
    int insertUserRole(@Param("userId") Long userId, @Param("roleId") Long roleId);
    int deleteUserRoleByUserId(@Param("userId") Long userId);
}

